import { z } from "zod";
import { llmCall } from "@/lib/llm/client";
import { DOMAIN_EXPANSION } from "@/lib/domains";
import type { DomainExpansion, UserProfile } from "@/types";
import { getDomainExpansion, saveDomainExpansion } from "@/lib/db/repos";

const schema = z.object({
  expandedSubfields: z.array(z.string()).min(5),
  jobSearchQueries: z.array(z.string()).min(3),
  eventSearchQueries: z.array(z.string()).min(3),
  learningSearchQueries: z.array(z.string()).min(3),
  jobTitles: z.array(z.string()).min(3),
});

export async function runDomainAgent(profile: UserProfile): Promise<DomainExpansion> {
  const cached = await getDomainExpansion(profile.userId);
  if (cached && cached.primaryDomain === profile.primaryDomain) {
    return cached;
  }

  const fallback = DOMAIN_EXPANSION[profile.primaryDomain] ?? DOMAIN_EXPANSION["AI general"];
  const locTokens = profile.locations.join(", ");

  const result = await llmCall({
    schema,
    system:
      "You are a career-discovery agent that expands an AI student's chosen primary domain into a rich set of related subfields, job titles, and search queries for jobs, events, and learning resources. Return strict JSON.",
    user: `User primary domain: ${profile.primaryDomain}
Experience level: ${profile.level}
Locations: ${locTokens}
Skills: ${profile.skills.join(", ") || "(none yet)"}
Goals: ${profile.careerGoals.join(", ")}

Return JSON with keys: expandedSubfields (15+ items), jobSearchQueries (6+ items with location and level when relevant), eventSearchQueries (6+ items mentioning Alberta/Calgary/online), learningSearchQueries (6+ items appropriate for the level), jobTitles (6+ titles).`,
    maxTokens: 600,
    mock: () => ({
      expandedSubfields: fallback.subfields,
      jobSearchQueries: fallback.jobQueries,
      eventSearchQueries: fallback.eventQueries,
      learningSearchQueries: fallback.learningQueries,
      jobTitles: fallback.jobTitles,
    }),
  });

  const expansion: DomainExpansion = {
    userId: profile.userId,
    primaryDomain: profile.primaryDomain,
    expandedSubfields: result.expandedSubfields,
    jobSearchQueries: result.jobSearchQueries,
    eventSearchQueries: result.eventSearchQueries,
    learningSearchQueries: result.learningSearchQueries,
    jobTitles: result.jobTitles,
    createdAt: new Date().toISOString(),
  };
  await saveDomainExpansion(expansion);
  return expansion;
}
