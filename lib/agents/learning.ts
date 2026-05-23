import coursesSeed from "@/seed/courses.json";
import { bandAction, bandFor, clampScore } from "@/lib/scoring";
import { courseKey } from "@/lib/dedupe";
import {
  findOpportunityByKey,
  findOpportunityByUrl,
  insertOpportunity,
} from "@/lib/db/repos";
import type {
  CoursePayload,
  DomainExpansion,
  ExperienceLevel,
  OpportunityDoc,
  UserProfile,
} from "@/types";

interface CourseSeed {
  title: string;
  provider: string;
  level: ExperienceLevel;
  cost: string;
  estimatedHours: number;
  url: string;
  domains: string[];
  bestFor: string[];
  pathWeek?: number;
}

const LEVEL_RANK: Record<ExperienceLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

function levelScore(profile: UserProfile, c: CourseSeed): number {
  const diff = Math.abs(LEVEL_RANK[profile.level] - LEVEL_RANK[c.level]);
  if (diff === 0) return 100;
  if (diff === 1) return 70;
  return 35;
}

function domainScore(domainExp: DomainExpansion, c: CourseSeed): number {
  const domains = new Set(c.domains.map((d) => d.toLowerCase()));
  return domains.has(domainExp.primaryDomain.toLowerCase()) ? 100 : 50;
}

function suggestedTasks(c: CourseSeed): string[] {
  const tasks: string[] = [];
  const moduleCount = Math.max(3, Math.min(8, Math.round(c.estimatedHours / 2)));
  for (let i = 1; i <= Math.min(4, moduleCount); i++) {
    tasks.push(`Complete module ${i} of ${c.title}`);
  }
  tasks.push(`Build a tiny project applying ${c.title} concepts`);
  return tasks;
}

export interface LearningAgentResult {
  found: number;
  newInserted: number;
  inserted: OpportunityDoc[];
}

export async function runLearningAgent(
  profile: UserProfile,
  domainExp: DomainExpansion,
): Promise<LearningAgentResult> {
  const all = coursesSeed as CourseSeed[];

  const scored = all.map((c) => {
    const dom = domainScore(domainExp, c);
    const lvl = levelScore(profile, c);
    const score = clampScore(0.6 * dom + 0.4 * lvl);
    return { c, score };
  });

  const candidates = scored
    .filter((s) => s.score >= 55)
    .sort((a, b) => {
      // Prefer ordered learning path first if both are in path
      if (a.c.pathWeek && b.c.pathWeek) return a.c.pathWeek - b.c.pathWeek;
      if (a.c.pathWeek && !b.c.pathWeek) return -1;
      if (!a.c.pathWeek && b.c.pathWeek) return 1;
      return b.score - a.score;
    })
    .slice(0, 10);

  const now = new Date().toISOString();
  const inserted: OpportunityDoc[] = [];
  for (const { c, score } of candidates) {
    const band = bandFor(score);
    const payload: CoursePayload = {
      title: c.title,
      provider: c.provider,
      level: c.level,
      cost: c.cost,
      estimatedHours: c.estimatedHours,
      url: c.url,
      bestFor: c.bestFor,
      whyUseful: `Builds ${profile.primaryDomain} skills at the ${c.level} level. Fits your ${profile.weeklyHours}h/week budget.`,
      suggestedLearningTasks: suggestedTasks(c),
      recommendedAction: bandAction(band, "course"),
      pathWeek: c.pathWeek,
    };
    const dedupeKey = courseKey(payload.title, payload.provider);
    const existing =
      (await findOpportunityByKey(profile.userId, "course", dedupeKey)) ||
      (await findOpportunityByUrl(profile.userId, payload.url));
    if (existing) continue;
    const doc = await insertOpportunity({
      userId: profile.userId,
      kind: "course",
      dedupeKey,
      sourceUrl: payload.url,
      source: payload.provider,
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
