import eventsSeed from "@/seed/events.json";
import { bandAction, bandFor, clampScore } from "@/lib/scoring";
import { eventKey } from "@/lib/dedupe";
import { defaultDurationMinutesForEvent } from "@/lib/events/config";
import {
  findOpportunityByKey,
  findOpportunityByUrl,
  insertOpportunity,
} from "@/lib/db/repos";
import type {
  DomainExpansion,
  EventPayload,
  EventSubtype,
  OpportunityDoc,
  UserProfile,
} from "@/types";

interface EventSeed {
  title: string;
  eventType: EventSubtype;
  organizer: string;
  date: string;
  location: string;
  isOnline: boolean;
  source: string;
  url: string;
  tags: string[];
  domains: string[];
  likelyTopics?: string[];
  likelyAttendees?: string[];
  prizes?: string;
  evaluationCriteria?: string;
}

function locationScore(profile: UserProfile, ev: EventSeed): number {
  const locs = profile.locations.map((l) => l.toLowerCase());
  const loc = ev.location.toLowerCase();
  if ((locs.includes("online") || locs.includes("remote")) && ev.isOnline) return 95;
  if (locs.includes("calgary") && loc.includes("calgary")) return 100;
  if (locs.includes("alberta") && (loc.includes("alberta") || loc.includes("edmonton") || loc.includes("calgary"))) return 85;
  if (locs.includes("canada") && (loc.includes("canada") || loc.includes("toronto") || loc.includes("ontario"))) return 70;
  if (ev.isOnline) return 65;
  return 30;
}

function domainScore(domainExp: DomainExpansion, ev: EventSeed): number {
  const domains = new Set(ev.domains.map((d) => d.toLowerCase()));
  if (domains.has(domainExp.primaryDomain.toLowerCase())) return 100;
  const subSet = new Set(domainExp.expandedSubfields.map((s) => s.toLowerCase()));
  const hits = ev.tags.filter((t) => subSet.has(t.toLowerCase())).length;
  if (hits >= 2) return 80;
  if (hits === 1) return 60;
  return 30;
}

function typeBonus(profile: UserProfile, ev: EventSeed): number {
  const wants = new Set(profile.opportunityTypes);
  if (ev.eventType === "hackathon" && wants.has("hackathons")) return 100;
  if (ev.eventType === "competition" && wants.has("competitions")) return 95;
  if (ev.eventType === "networking" && wants.has("networking events")) return 90;
  if ((ev.eventType === "workshop" || ev.eventType === "meetup" || ev.eventType === "webinar")) return 75;
  if (ev.eventType === "career fair" && wants.has("jobs")) return 90;
  return 60;
}

function urgencyFor(date: string): "low" | "medium" | "high" {
  const d = new Date(date).getTime();
  const diff = d - Date.now();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 10) return "high";
  if (days < 25) return "medium";
  return "low";
}

function networkingValue(ev: EventSeed): number {
  if (ev.eventType === "networking" || ev.eventType === "career fair") return 95;
  if (ev.eventType === "meetup") return 85;
  if (ev.eventType === "conference") return 80;
  if (ev.eventType === "workshop") return 60;
  return 50;
}
function portfolioValue(ev: EventSeed): number {
  if (ev.eventType === "hackathon") return 95;
  if (ev.eventType === "competition") return 90;
  if (ev.eventType === "workshop") return 70;
  if (ev.eventType === "meetup") return 40;
  return 50;
}

function buildDetailedDescription(profile: UserProfile, ev: EventSeed): string {
  const parts: string[] = [];
  if (ev.eventType === "hackathon" || ev.eventType === "competition") {
    parts.push(`Theme: ${ev.tags.join(", ")}.`);
    if (ev.evaluationCriteria) parts.push(`Judging on: ${ev.evaluationCriteria}.`);
    if (ev.prizes) parts.push(`Prizes: ${ev.prizes}.`);
    parts.push(
      `Great for your portfolio in ${profile.primaryDomain}. Aim to ship a working demo and a 90-second pitch video.`,
    );
  } else if (ev.eventType === "networking" || ev.eventType === "career fair") {
    parts.push(`Likely topics: ${(ev.likelyTopics || ev.tags).join(", ")}.`);
    if (ev.likelyAttendees && ev.likelyAttendees.length > 0)
      parts.push(`Likely attendees: ${ev.likelyAttendees.join(", ")}.`);
    parts.push(
      "Bring a 30-second intro, business cards or a LinkedIn QR, and 3 thoughtful questions.",
    );
  } else {
    parts.push(`Topics: ${(ev.likelyTopics || ev.tags).join(", ")}.`);
    parts.push(
      `Useful for building your ${profile.primaryDomain} foundations. Take notes you can turn into a blog post for your portfolio.`,
    );
  }
  return parts.join(" ");
}

function suggestedPrep(ev: EventSeed): string[] {
  if (ev.eventType === "hackathon" || ev.eventType === "competition") {
    return [
      "Form or join a team",
      "Sketch project idea + scope",
      "Set up repo and dev environment",
      "Draft 90-second demo script",
    ];
  }
  if (ev.eventType === "networking" || ev.eventType === "career fair") {
    return [
      "Update LinkedIn headline + photo",
      "Prepare 30-second intro",
      "Research 3 attending companies",
      "Print or QR-share your resume",
    ];
  }
  return ["Read 1 primer on the topic", "Prepare 2 questions", "Take structured notes"];
}

function scoreEvent(profile: UserProfile, domainExp: DomainExpansion, ev: EventSeed) {
  const dom = domainScore(domainExp, ev);
  const loc = locationScore(profile, ev);
  const tBonus = typeBonus(profile, ev);
  const score = clampScore(0.4 * dom + 0.3 * loc + 0.3 * tBonus);
  return score;
}

export interface EventAgentResult {
  found: number;
  newInserted: number;
  inserted: OpportunityDoc[];
}

export async function runEventAgent(
  profile: UserProfile,
  domainExp: DomainExpansion,
): Promise<EventAgentResult> {
  const all = eventsSeed as EventSeed[];
  const candidates = all
    .map((ev) => ({ ev, score: scoreEvent(profile, domainExp, ev) }))
    .filter((c) => c.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const now = new Date().toISOString();
  const inserted: OpportunityDoc[] = [];
  for (const { ev, score } of candidates) {
    const band = bandFor(score);
    const payload: EventPayload = {
      title: ev.title,
      eventType: ev.eventType,
      organizer: ev.organizer,
      date: ev.date,
      durationMinutes: defaultDurationMinutesForEvent(ev.eventType),
      location: ev.location,
      isOnline: ev.isOnline,
      source: ev.source,
      url: ev.url,
      networkingValue: networkingValue(ev),
      portfolioValue: portfolioValue(ev),
      urgency: urgencyFor(ev.date),
      detailedDescription: buildDetailedDescription(profile, ev),
      likelyTopics: ev.likelyTopics,
      likelyAttendees: ev.likelyAttendees,
      prizes: ev.prizes,
      evaluationCriteria: ev.evaluationCriteria,
      whyUseful: `Strong fit for ${profile.primaryDomain} (${score}/100). ${ev.isOnline ? "Online and free" : "Local to " + ev.location}.`,
      suggestedPrep: suggestedPrep(ev),
      suggestedProjectAngle:
        ev.eventType === "hackathon" || ev.eventType === "competition"
          ? `Build a small ${profile.primaryDomain} project that demos one clear capability end-to-end.`
          : undefined,
      recommendedAction: bandAction(band, "event"),
    };
    const dedupeKey = eventKey(payload.title, payload.organizer, payload.date);
    const existing =
      (await findOpportunityByKey(profile.userId, "event", dedupeKey)) ||
      (await findOpportunityByUrl(profile.userId, payload.url));
    if (existing) continue;
    const doc = await insertOpportunity({
      userId: profile.userId,
      kind: "event",
      dedupeKey,
      sourceUrl: payload.url,
      source: payload.source,
      payload,
      score,
      scoreBand: band,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
    inserted.push(doc);
  }
  return { found: candidates.length, newInserted: inserted.length, inserted };
}
