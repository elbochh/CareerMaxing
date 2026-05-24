import { bandAction, bandFor, clampScore, skillOverlap } from "@/lib/scoring";
import { jobKey } from "@/lib/dedupe";
import { upsertOpportunityForScan } from "@/lib/db/repos";
import { profileFingerprint } from "@/lib/profile";
import { fetchRemotiveJobs } from "@/lib/services/remotive";
import { fetchArbeitnowJobs } from "@/lib/services/arbeitnow";
import { validateResourceBatch } from "@/lib/source-validation";
import type {
  AgentScanContext,
  DomainExpansion,
  ExperienceLevel,
  JobPayload,
  LocationPref,
  OpportunityDoc,
  UserProfile,
} from "@/types";

interface JobSeed {
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  level: ExperienceLevel;
  source: string;
  url: string;
  description: string;
  tags: string[];
  requiredSkills: string[];
  niceToHaveSkills: string[];
  domains: string[];
}

const LEVEL_RANK: Record<ExperienceLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

function locationScore(profile: UserProfile, job: JobSeed): number {
  const locs = profile.locations.map((l) => l.toLowerCase());
  const jobLoc = job.location.toLowerCase();
  let score = 0;
  if (locs.includes("calgary") && jobLoc.includes("calgary")) score = Math.max(score, 100);
  if (locs.includes("alberta") && (jobLoc.includes("alberta") || jobLoc.includes("calgary") || jobLoc.includes("edmonton"))) score = Math.max(score, 90);
  if (locs.includes("canada") && (jobLoc.includes("canada") || jobLoc.includes("toronto") || jobLoc.includes("alberta") || jobLoc.includes("calgary") || jobLoc.includes("ontario"))) score = Math.max(score, 75);
  if ((locs.includes("remote") || locs.includes("online")) && job.isRemote) score = Math.max(score, 95);
  return score;
}

function matchesLocationPreference(profile: UserProfile, job: JobSeed): boolean {
  const locs = profile.locations.map((l) => l.toLowerCase());
  const jobLoc = job.location.toLowerCase();

  if ((locs.includes("remote") || locs.includes("online")) && job.isRemote) return true;
  if (locs.includes("calgary") && jobLoc.includes("calgary")) return true;
  if (
    locs.includes("alberta") &&
    (jobLoc.includes("alberta") || jobLoc.includes("calgary") || jobLoc.includes("edmonton"))
  ) {
    return true;
  }
  if (
    locs.includes("canada") &&
    (jobLoc.includes("canada") ||
      jobLoc.includes("toronto") ||
      jobLoc.includes("vancouver") ||
      jobLoc.includes("montreal") ||
      jobLoc.includes("ottawa") ||
      jobLoc.includes("alberta") ||
      jobLoc.includes("calgary") ||
      jobLoc.includes("ontario"))
  ) {
    return true;
  }

  return false;
}

function domainScore(domainExp: DomainExpansion, job: JobSeed): number {
  const jobDomains = new Set(job.domains.map((d) => d.toLowerCase()));
  const primary = domainExp.primaryDomain.toLowerCase();
  if (jobDomains.has(primary)) return 100;
  if (primary === "nlp" && jobDomains.has("nlp / llms")) return 100;
  if (primary !== "ai general" && jobDomains.has("ai general")) return 65;
  // Subfield/tag overlap
  const subSet = new Set(domainExp.expandedSubfields.map((s) => s.toLowerCase()));
  const tagHits = job.tags.filter((t) => subSet.has(t.toLowerCase())).length;
  if (tagHits >= 2) return 80;
  if (tagHits === 1) return 60;
  return 30;
}

function levelScore(profile: UserProfile, job: JobSeed): number {
  const u = LEVEL_RANK[profile.level];
  const j = LEVEL_RANK[job.level];
  const diff = Math.abs(u - j);
  if (diff === 0) return 100;
  if (diff === 1) return 70;
  return 40;
}

function scoreJob(profile: UserProfile, domainExp: DomainExpansion, job: JobSeed) {
  const overlap = skillOverlap(profile.skills, job.requiredSkills, job.niceToHaveSkills);
  const skillScore = clampScore(overlap.matchedRatio * 100);
  const loc = locationScore(profile, job);
  const dom = domainScore(domainExp, job);
  const lvl = levelScore(profile, job);
  // Weighted blend
  const score = clampScore(0.35 * dom + 0.25 * skillScore + 0.2 * loc + 0.2 * lvl);
  return { score, matched: overlap.matched, missing: overlap.missing };
}

function buildPayload(
  profile: UserProfile,
  domainExp: DomainExpansion,
  job: JobSeed,
): { payload: JobPayload; score: number } {
  const { score, matched, missing } = scoreJob(profile, domainExp, job);
  const band = bandFor(score);
  const whyUseful = buildWhy(profile, domainExp, job, score, matched);
  const resumeKeywords = Array.from(new Set([...job.tags, ...job.requiredSkills])).slice(0, 8);
  const payload: JobPayload = {
    title: job.title,
    company: job.company,
    location: job.location,
    source: job.source,
    url: job.url,
    description: job.description,
    level: job.level,
    isRemote: job.isRemote,
    difficulty: job.level,
    matchedSkills: matched,
    missingSkills: missing,
    resumeKeywords,
    whyUseful,
    recommendedAction: bandAction(band, "job"),
  };
  return { payload, score };
}

function buildWhy(
  profile: UserProfile,
  domainExp: DomainExpansion,
  job: JobSeed,
  score: number,
  matched: string[],
): string {
  const parts: string[] = [];
  parts.push(
    `Aligns with your ${profile.primaryDomain} focus through ${job.tags.slice(0, 3).join(", ")}.`,
  );
  if (matched.length > 0) parts.push(`You already have: ${matched.slice(0, 4).join(", ")}.`);
  if (job.isRemote) parts.push("Remote-friendly.");
  if (job.location.toLowerCase().includes("calgary")) parts.push("Based in Calgary.");
  parts.push(`Fit score: ${score}/100.`);
  parts.push("Source verified.");
  return parts.join(" ");
}

export interface JobAgentResult {
  found: number;
  newInserted: number;
  updatedExisting: number;
  inserted: OpportunityDoc[];
  rejected: number;
}

function dedupeJobs(jobs: JobSeed[]): JobSeed[] {
  const seen = new Set<string>();
  const out: JobSeed[] = [];
  for (const j of jobs) {
    const key = `${j.title.toLowerCase().trim()}|${j.company.toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(j);
  }
  return out;
}

export async function runJobAgent(
  profile: UserProfile,
  domainExp: DomainExpansion,
  scanContext?: AgentScanContext,
): Promise<JobAgentResult> {
  let liveJobs: JobSeed[] = [];
  try {
    const queries = [
      ...(domainExp.jobSearchQueries || []),
      profile.primaryDomain,
      ...profile.skills.slice(0, 4),
    ];
    const [remotive, arbeitnow] = await Promise.all([
      fetchRemotiveJobs(queries),
      fetchArbeitnowJobs(queries),
    ]);
    liveJobs = [...remotive, ...arbeitnow] as JobSeed[];
  } catch (err) {
    console.warn("[jobs] live fetch failed:", (err as Error).message);
  }

  const candidates = dedupeJobs(liveJobs)
    .filter((j) => matchesLocationPreference(profile, j))
    .map((j) => ({ job: j, ...scoreJob(profile, domainExp, j) }))
    .filter((c) => c.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24);

  const audit = await validateResourceBatch("jobs", candidates, (c) => ({
    kind: "job",
    title: c.job.title,
    organization: c.job.company,
    location: c.job.location,
    isOnline: c.job.isRemote,
    sourceName: c.job.source,
    sourceUrl: c.job.url,
    evidenceType: "trusted_api",
  }));

  const now = new Date().toISOString();
  const context = scanContext || {
    profileFingerprint: profileFingerprint(profile),
    scanId: `scan_${now}`,
  };
  const inserted: OpportunityDoc[] = [];
  let updatedExisting = 0;
  for (const { item: c, validation } of audit.accepted) {
    const { payload, score } = buildPayload(profile, domainExp, c.job);
    const dedupeKey = jobKey(payload.title, payload.company, payload.location);
    const result = await upsertOpportunityForScan({
      userId: profile.userId,
      kind: "job",
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
      scoreBand: bandFor(score),
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
