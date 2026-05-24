import coursesSeed from "@/seed/courses.json";
import { bandAction, bandFor, clampScore } from "@/lib/scoring";
import { courseKey } from "@/lib/dedupe";
import { upsertOpportunityForScan } from "@/lib/db/repos";
import { profileFingerprint } from "@/lib/profile";
import { llmCall, llmEnabled } from "@/lib/llm/client";
import { validateResourceBatch } from "@/lib/source-validation";
import { z } from "zod";
import type {
  AgentScanContext,
  CoursePayload,
  DomainExpansion,
  ExperienceLevel,
  OpportunityDoc,
  SourceEvidenceType,
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

type CourseCandidate = CourseSeed & { evidenceType: SourceEvidenceType };

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

const LlmCourseSchema = z.object({
  recommendations: z.array(
    z.object({
      title: z.string().min(2).max(140),
      provider: z.string().min(2).max(80),
      url: z.string().url(),
      level: z.enum(["beginner", "intermediate", "advanced"]),
      estimatedHours: z.number().min(1).max(200),
      domains: z.array(z.string()).min(1).max(6),
      bestFor: z.array(z.string()).min(1).max(6),
      rationale: z.string().min(8).max(280),
    }),
  ),
});

async function fetchLlmRecommendations(
  profile: UserProfile,
  domainExp: DomainExpansion,
): Promise<CourseSeed[]> {
  if (!llmEnabled()) return [];
  const system = `You are a senior AI career mentor. Recommend up to 6 high-quality, mostly free or low-cost AI learning resources that map directly to the user's profile and domain expansion.

Strict source rule: Only return opportunities that are directly supported by a real source URL. If no source exists, return nothing. Do not invent course names, providers, dates, or URLs.

Prefer well-known providers (Coursera, DeepLearning.AI, Fast.ai, Hugging Face, Anthropic, OpenAI Cookbook, Stanford, MIT OCW, freeCodeCamp, Google Cloud Skills Boost, Microsoft Learn, AWS Skill Builder). Each URL must be the real canonical course/course-list page. Output strict JSON.`;
  const user = JSON.stringify({
    profile: {
      level: profile.level,
      primaryDomain: profile.primaryDomain,
      weeklyHours: profile.weeklyHours,
      skills: profile.skills,
      careerGoals: profile.careerGoals,
    },
    domain: {
      expandedSubfields: domainExp.expandedSubfields.slice(0, 10),
      learningSearchQueries: domainExp.learningSearchQueries?.slice(0, 6),
    },
    schema: {
      recommendations: [
        {
          title: "string",
          provider: "string",
          url: "https://...",
          level: "beginner|intermediate|advanced",
          estimatedHours: "number",
          domains: ["string"],
          bestFor: ["string"],
          rationale: "1 sentence",
        },
      ],
    },
  });
  try {
    const result = await llmCall({
      system,
      user,
      schema: LlmCourseSchema,
      maxTokens: 800,
      temperature: 0.3,
      mock: () => ({ recommendations: [] }),
    });
    return result.recommendations.map((r) => ({
      title: r.title,
      provider: r.provider,
      level: r.level,
      cost: "Free / low-cost",
      estimatedHours: r.estimatedHours,
      url: r.url,
      domains: r.domains,
      bestFor: r.bestFor,
    }));
  } catch (err) {
    console.warn("[learning] LLM recommendations failed:", (err as Error).message);
    return [];
  }
}

function dedupeCourses<T extends CourseSeed>(courses: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const c of courses) {
    const key = `${c.title.toLowerCase().trim()}|${c.provider.toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

export interface LearningAgentResult {
  found: number;
  newInserted: number;
  updatedExisting: number;
  inserted: OpportunityDoc[];
  rejected: number;
}

export async function runLearningAgent(
  profile: UserProfile,
  domainExp: DomainExpansion,
  scanContext?: AgentScanContext,
): Promise<LearningAgentResult> {
  const seed = (coursesSeed as CourseSeed[]).map<CourseCandidate>((c) => ({
    ...c,
    evidenceType: "curated",
  }));
  const live = (await fetchLlmRecommendations(profile, domainExp)).map<CourseCandidate>((c) => ({
    ...c,
    evidenceType: "ai",
  }));
  const all = dedupeCourses([...live, ...seed]);

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

  const audit = await validateResourceBatch("learning", candidates, (s) => ({
    kind: "course",
    title: s.c.title,
    organization: s.c.provider,
    sourceName: s.c.provider,
    sourceUrl: s.c.url,
    evidenceType: s.c.evidenceType,
  }));

  const now = new Date().toISOString();
  const context = scanContext || {
    profileFingerprint: profileFingerprint(profile),
    scanId: `scan_${now}`,
  };
  const inserted: OpportunityDoc[] = [];
  let updatedExisting = 0;
  for (const { item: { c, score }, validation } of audit.accepted) {
    const band = bandFor(score);
    const payload: CoursePayload = {
      title: c.title,
      provider: c.provider,
      level: c.level,
      cost: c.cost,
      estimatedHours: c.estimatedHours,
      url: validation.sourceUrl,
      bestFor: c.bestFor,
      whyUseful: `Builds ${profile.primaryDomain} skills at the ${c.level} level. Fits your ${profile.weeklyHours}h/week budget. Source verified.`,
      suggestedLearningTasks: suggestedTasks(c),
      recommendedAction: bandAction(band, "course"),
      pathWeek: c.pathWeek,
    };
    const dedupeKey = courseKey(payload.title, payload.provider);
    const result = await upsertOpportunityForScan({
      userId: profile.userId,
      kind: "course",
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
