import jobsSeed from "@/seed/jobs.json";
import { bandAction, bandFor, clampScore, skillOverlap } from "@/lib/scoring";
import { jobKey } from "@/lib/dedupe";
import {
  findOpportunityByKey,
  findOpportunityByUrl,
  insertOpportunity,
} from "@/lib/db/repos";
import { fetchRemotiveJobs } from "@/lib/services/remotive";
import type {
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

function domainScore(domainExp: DomainExpansion, job: JobSeed): number {
  const jobDomains = new Set(job.domains.map((d) => d.toLowerCase()));
  if (jobDomains.has(domainExp.primaryDomain.toLowerCase())) return 100;
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
  return parts.join(" ");
}

export interface JobAgentResult {
  found: number;
  newInserted: number;
  inserted: OpportunityDoc[];
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
): Promise<JobAgentResult> {
  const useMock = process.env.USE_MOCK_DATA !== "false";

  let liveJobs: JobSeed[] = [];
  if (!useMock) {
    try {
      const queries = (domainExp.jobSearchQueries || []).slice(0, 3);
      const remotive = await fetchRemotiveJobs(queries);
      liveJobs = remotive as JobSeed[];
    } catch (err) {
      console.warn("[jobs] live fetch failed, falling back to seed:", (err as Error).message);
    }
  }
  const allJobs = dedupeJobs([...liveJobs, ...(jobsSeed as JobSeed[])]);

  const candidates = allJobs
    .map((j) => ({ job: j, ...scoreJob(profile, domainExp, j) }))
    .filter((c) => c.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, useMock ? 12 : 24);

  const now = new Date().toISOString();
  const inserted: OpportunityDoc[] = [];
  for (const c of candidates) {
    const { payload, score } = buildPayload(profile, domainExp, c.job);
    const dedupeKey = jobKey(payload.title, payload.company, payload.location);
    const existing =
      (await findOpportunityByKey(profile.userId, "job", dedupeKey)) ||
      (await findOpportunityByUrl(profile.userId, payload.url));
    if (existing) continue;
    const doc = await insertOpportunity({
      userId: profile.userId,
      kind: "job",
      dedupeKey,
      sourceUrl: payload.url,
      source: payload.source,
      payload,
      score,
      scoreBand: bandFor(score),
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
    inserted.push(doc);
  }
  return { found: candidates.length, newInserted: inserted.length, inserted };
}
