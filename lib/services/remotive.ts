/**
 * Free, no-key job source: https://remotive.com/api/remote-jobs
 * Docs: https://github.com/remotive-com/remote-jobs-api
 */
import type { ExperienceLevel } from "@/types";

export interface RemotiveJobSeed {
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

interface RemotiveApiJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary?: string;
  description: string;
}

interface RemotiveApiResponse {
  jobs?: RemotiveApiJob[];
}

const BASE =
  process.env.REMOTIVE_API_BASE || "https://remotive.com/api/remote-jobs";

// AI/ML signals that, when present in the TITLE, mark a job as AI-relevant.
const AI_TITLE_SIGNALS = [
  "ai engineer",
  "ai developer",
  "ai agent",
  "ai automation",
  "ai/ml",
  "ml/ai",
  "ml engineer",
  "ml developer",
  "machine learning",
  "deep learning",
  "data scien",
  "nlp",
  "llm",
  "generative ai",
  "gen ai",
  "computer vision",
  "mlops",
  "prompt eng",
  "applied ai",
  "applied ml",
  "applied scientist",
  "research scientist",
  "research engineer",
  "ai research",
  "ml research",
  "rag engineer",
  "langchain",
  "agent engineer",
  "ai intern",
  "ml intern",
  "ai product",
  "ai/data",
];

// Hard exclude — non-engineering roles that may have "AI" in the title.
const EXCLUDE_TITLE = [
  "office assistant",
  "media specialist",
  "media buyer",
  "sales",
  "account exec",
  "customer support",
  "customer service",
  "recruiter",
  "talent acquisition",
  "hr ",
  "human resources",
  "video editor",
  "video artist",
  "writer",
  "copywriter",
  "translator",
  "designer",
  "director",
  "head of",
  "vp of",
  "vice president",
  "business transformation",
  "revenue",
  "marketing",
  "operations manager",
  "project manager",
];

function inferLevel(title: string, tags: string[], job_type: string): ExperienceLevel {
  const t = `${title} ${tags.join(" ")} ${job_type}`.toLowerCase();
  if (/(intern|junior|entry|graduate|new grad|jr\.|trainee)/.test(t)) return "beginner";
  if (/(senior|staff|principal|lead|sr\.)/.test(t)) return "advanced";
  return "intermediate";
}

function inferDomains(title: string, tags: string[], category?: string): string[] {
  const t = `${title} ${tags.join(" ")} ${category || ""}`.toLowerCase();
  const out = new Set<string>(["AI general"]);
  if (/(agent|langchain|langgraph|autogen|crewai|rag|tool[\s\-]?use)/.test(t)) out.add("Agentic AI");
  if (/(nlp|llm|gpt|language|chatbot|conversational)/.test(t)) out.add("NLP / LLMs");
  if (/(vision|cv|image|detection|segmentation)/.test(t)) out.add("Computer Vision");
  if (/(mlops|infra|pipeline|deploy|kubernetes|airflow)/.test(t)) out.add("MLOps");
  if (/(data scien|analyt)/.test(t)) out.add("Data Science");
  if (/(machine learning|ml engineer|deep learning|reinforcement)/.test(t)) out.add("Machine Learning");
  if (/(robot)/.test(t)) out.add("Robotics");
  return Array.from(out);
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function looksAi(j: RemotiveApiJob): boolean {
  const titleLc = (j.title || "").toLowerCase();
  for (const ex of EXCLUDE_TITLE) {
    if (titleLc.includes(ex)) return false;
  }
  // Strong signal: title contains an AI/ML engineering keyword.
  if (AI_TITLE_SIGNALS.some((kw) => titleLc.includes(kw))) return true;
  // Soft signal: Remotive officially categorizes this job as AI and the title
  // is a credible engineering role (not in the exclude list above).
  const cat = (j.category || "").toLowerCase();
  if (cat.includes("artificial") || cat.includes("data scien")) {
    if (/\b(engineer|developer|scientist|researcher|architect|intern)\b/.test(titleLc)) {
      return true;
    }
  }
  return false;
}

function map(j: RemotiveApiJob): RemotiveJobSeed {
  const level = inferLevel(j.title, j.tags, j.job_type);
  const description = stripHtml(j.description || "").slice(0, 600);
  const tags = (j.tags || []).slice(0, 12);
  return {
    title: j.title,
    company: j.company_name,
    location: j.candidate_required_location || "Remote",
    isRemote: true,
    level,
    source: "remotive",
    url: j.url,
    description,
    tags,
    requiredSkills: tags.slice(0, 6),
    niceToHaveSkills: tags.slice(6, 10),
    domains: inferDomains(j.title, j.tags, j.category),
  };
}

export async function fetchRemotiveJobs(
  queries: string[],
  perQuery = 25,
): Promise<RemotiveJobSeed[]> {
  const out: RemotiveJobSeed[] = [];
  const seenUrls = new Set<string>();
  const seenIds = new Set<number>();

  // Prefer Remotive's dedicated AI category, then targeted searches.
  const buckets: Array<{ params: URLSearchParams }> = [
    {
      params: new URLSearchParams({
        category: "artificial-intelligence",
        limit: String(perQuery),
      }),
    },
    { params: new URLSearchParams({ search: "machine learning", limit: String(perQuery) }) },
    { params: new URLSearchParams({ search: "ai engineer", limit: String(perQuery) }) },
  ];
  for (const q of queries.slice(0, 3)) {
    buckets.push({
      params: new URLSearchParams({ search: q, limit: String(perQuery) }),
    });
  }

  for (const b of buckets) {
    try {
      const url = `${BASE}?${b.params.toString()}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        next: { revalidate: 0 },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as RemotiveApiResponse;
      const items = data.jobs || [];
      for (const j of items) {
        if (seenIds.has(j.id) || seenUrls.has(j.url)) continue;
        if (!looksAi(j)) continue;
        seenIds.add(j.id);
        seenUrls.add(j.url);
        out.push(map(j));
        if (out.length >= 60) return out;
      }
    } catch (err) {
      console.warn("[remotive] fetch failed:", (err as Error).message);
    }
  }
  return out;
}
