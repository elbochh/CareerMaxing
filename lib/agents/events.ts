import { bandAction, bandFor, clampScore } from "@/lib/scoring";
import { eventKey } from "@/lib/dedupe";
import { upsertOpportunityForScan } from "@/lib/db/repos";
import { profileFingerprint } from "@/lib/profile";
import { fetchDevpostHackathons } from "@/lib/services/devpost";
import { validateResourceBatch } from "@/lib/source-validation";
import type {
  AgentScanContext,
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
  updatedExisting: number;
  inserted: OpportunityDoc[];
  rejected: number;
}

function dedupeEvents(events: EventSeed[]): EventSeed[] {
  const seen = new Set<string>();
  const out: EventSeed[] = [];
  for (const ev of events) {
    const key = `${ev.title.toLowerCase().trim()}|${ev.organizer.toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ev);
  }
  return out;
}

export async function runEventAgent(
  profile: UserProfile,
  domainExp: DomainExpansion,
  scanContext?: AgentScanContext,
): Promise<EventAgentResult> {
  let liveEvents: EventSeed[] = [];
  try {
    const devpost = await fetchDevpostHackathons();
    liveEvents = devpost as EventSeed[];
  } catch (err) {
    console.warn("[events] devpost fetch failed:", (err as Error).message);
  }
  const candidates = dedupeEvents(liveEvents)
    .map((ev) => ({ ev, score: scoreEvent(profile, domainExp, ev) }))
    .filter((c) => c.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24);

  const audit = await validateResourceBatch("events", candidates, (c) => ({
    kind: "event",
    title: c.ev.title,
    organization: c.ev.organizer,
    location: c.ev.location,
    isOnline: c.ev.isOnline,
    eventDate: c.ev.date,
    sourceName: c.ev.source,
    sourceUrl: c.ev.url,
    evidenceType: "trusted_api",
  }));

  const now = new Date().toISOString();
  const context = scanContext || {
    profileFingerprint: profileFingerprint(profile),
    scanId: `scan_${now}`,
  };
  const inserted: OpportunityDoc[] = [];
  let updatedExisting = 0;
  for (const { item: { ev, score }, validation } of audit.accepted) {
    const band = bandFor(score);
    const payload: EventPayload = {
      title: ev.title,
      eventType: ev.eventType,
      organizer: ev.organizer,
      date: ev.date,
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
      whyUseful: `Strong fit for ${profile.primaryDomain} (${score}/100). ${ev.isOnline ? "Online and free" : "Local to " + ev.location}. Source verified.`,
      suggestedPrep: suggestedPrep(ev),
      suggestedProjectAngle:
        ev.eventType === "hackathon" || ev.eventType === "competition"
          ? `Build a small ${profile.primaryDomain} project that demos one clear capability end-to-end.`
          : undefined,
      recommendedAction: bandAction(band, "event"),
    };
    const dedupeKey = eventKey(payload.title, payload.organizer, payload.date);
    const result = await upsertOpportunityForScan({
      userId: profile.userId,
      kind: "event",
      profileFingerprint: context.profileFingerprint,
      scanId: context.scanId,
      dedupeKey,
      sourceUrl: validation.sourceUrl,
      source: validation.sourceName,
      isVerified: validation.isVerified,
      verifiedAt: validation.verifiedAt,
      sourceName: validation.sourceName,
      confidenceScore: validation.confidenceScore,
      rejectionReason: validation.rejectionReason,
      verificationNotes: validation.verificationNotes,
      payload,
      score,
      scoreBand: band,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
    if (result.created) {
      inserted.push(result.opportunity);
    } else {
      updatedExisting += 1;
    }
  }
  return {
    found: audit.accepted.length,
    newInserted: inserted.length,
    updatedExisting,
    inserted,
    rejected: audit.rejected.length,
  };
}
