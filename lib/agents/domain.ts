import { z } from "zod";
import { llmCall } from "@/lib/llm/client";
import { DOMAIN_EXPANSION } from "@/lib/domains";
import type { DomainExpansion, UserProfile } from "@/types";
import { getDomainExpansion, saveDomainExpansion } from "@/lib/db/repos";
import { profileFingerprint } from "@/lib/profile";

const schema = z.object({
  expandedSubfields: z.array(z.string()).min(5),
  locationExpansions: z.array(z.string()).min(3),
  jobSearchQueries: z.array(z.string()).min(3),
  eventSearchQueries: z.array(z.string()).min(3),
  learningSearchQueries: z.array(z.string()).min(3),
  jobTitles: z.array(z.string()).min(3),
});

const LOCATION_EXPANSIONS: Record<string, string[]> = {
  calgary: ["Calgary", "Calgary AB", "Alberta", "Edmonton", "Remote Calgary", "Remote Alberta"],
  alberta: ["Alberta", "Calgary", "Edmonton", "Remote Alberta", "Western Canada"],
  canada: [
    "Canada",
    "Remote Canada",
    "Toronto",
    "Vancouver",
    "Montreal",
    "Ottawa",
    "Waterloo",
    "Calgary",
    "Edmonton",
    "Alberta",
    "Ontario",
    "British Columbia",
  ],
  remote: ["Remote", "Remote Canada", "Remote North America", "Worldwide remote"],
  online: ["Remote", "Online", "Virtual", "Remote Canada"],
};

function unique(items: string[], limit = 80): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const normalized = item.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= limit) break;
  }
  return out;
}

function expandLocations(profile: UserProfile): string[] {
  return unique(
    profile.locations.flatMap((loc) => {
      const key = loc.toLowerCase();
      return LOCATION_EXPANSIONS[key] || [loc];
    }),
    20,
  );
}

function levelTerms(level: UserProfile["level"], goals: UserProfile["careerGoals"]): string[] {
  const wantsInternship = goals.includes("get internship");
  if (level === "beginner") {
    return wantsInternship
      ? ["internship", "intern", "junior", "entry level", "new grad"]
      : ["junior", "entry level", "new grad"];
  }
  if (level === "intermediate") return ["junior", "intermediate", "associate"];
  return ["senior", "staff", "lead"];
}

function buildJobQueries(profile: UserProfile, fallback: { jobTitles: string[]; subfields: string[]; jobQueries: string[] }): string[] {
  const locations = expandLocations(profile);
  const titles = unique(
    [
      ...fallback.jobTitles,
      "AI Engineer",
      "Machine Learning Engineer",
      "Data Scientist",
      "Data Engineer",
      "AI Developer",
      "Python AI Developer",
      "Generative AI Engineer",
      "MLOps Engineer",
    ],
    12,
  );
  const domains = unique([profile.primaryDomain, ...fallback.subfields], 10);
  const levels = levelTerms(profile.level, profile.careerGoals);
  const generated: string[] = [];

  for (const location of locations) {
    for (const title of titles.slice(0, 8)) {
      generated.push(`${title} ${levels[0]} ${location}`);
    }
  }
  for (const location of locations.slice(0, 10)) {
    for (const domain of domains.slice(0, 8)) {
      generated.push(`${domain} ${levels[0]} jobs ${location}`);
    }
  }

  return unique([...fallback.jobQueries, ...generated], 60);
}

function hasLocationExpansion(cached: DomainExpansion): boolean {
  return Array.isArray(cached.locationExpansions) && cached.locationExpansions.length >= 3;
}

export async function runDomainAgent(profile: UserProfile): Promise<DomainExpansion> {
  const fingerprint = profileFingerprint(profile);
  const cached = await getDomainExpansion(profile.userId);
  if (
    cached &&
    cached.primaryDomain === profile.primaryDomain &&
    cached.profileFingerprint === fingerprint &&
    hasLocationExpansion(cached)
  ) {
    return cached;
  }

  const fallback = DOMAIN_EXPANSION[profile.primaryDomain] ?? DOMAIN_EXPANSION["AI general"];
  const locTokens = profile.locations.join(", ");

  const result = await llmCall({
    schema,
    system:
      "You are a career-discovery agent that expands an AI student's chosen primary domain into a rich set of related subfields, job titles, and search queries for jobs, events, and learning resources. You do not create or name specific opportunities; downstream agents may only display source-verified resources. Return strict JSON.",
    user: `User primary domain: ${profile.primaryDomain}
Experience level: ${profile.level}
Locations: ${locTokens}
Skills: ${profile.skills.join(", ") || "(none yet)"}
Goals: ${profile.careerGoals.join(", ")}

Return JSON with keys: expandedSubfields (15+ items), locationExpansions (8+ search locations/sublocations derived from the user's selected locations), jobSearchQueries (20+ items combining domain/title/level/location), eventSearchQueries (6+ items mentioning the expanded locations/online when relevant), learningSearchQueries (6+ items appropriate for the level), jobTitles (6+ titles).

For Canada, include sublocations such as Toronto, Vancouver, Montreal, Ottawa, Waterloo, Calgary, Edmonton, Alberta, Ontario, British Columbia, Remote Canada. These are search expansions only; do not invent opportunities.`,
    maxTokens: 1000,
    mock: () => ({
      expandedSubfields: fallback.subfields,
      locationExpansions: expandLocations(profile),
      jobSearchQueries: buildJobQueries(profile, fallback),
      eventSearchQueries: fallback.eventQueries,
      learningSearchQueries: fallback.learningQueries,
      jobTitles: fallback.jobTitles,
    }),
  });
  const locationExpansions = unique([...expandLocations(profile), ...result.locationExpansions], 20);
  const jobSearchQueries = unique(
    [
      ...result.jobSearchQueries,
      ...buildJobQueries(profile, {
        jobTitles: unique([...result.jobTitles, ...fallback.jobTitles], 12),
        subfields: unique([...result.expandedSubfields, ...fallback.subfields], 16),
        jobQueries: unique([...result.jobSearchQueries, ...fallback.jobQueries], 20),
      }),
    ],
    80,
  );

  const expansion: DomainExpansion = {
    userId: profile.userId,
    primaryDomain: profile.primaryDomain,
    profileFingerprint: fingerprint,
    expandedSubfields: result.expandedSubfields,
    locationExpansions,
    jobSearchQueries,
    eventSearchQueries: result.eventSearchQueries,
    learningSearchQueries: result.learningSearchQueries,
    jobTitles: result.jobTitles,
    createdAt: new Date().toISOString(),
  };
  await saveDomainExpansion(expansion);
  return expansion;
}
