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

const AI_TAGS = new Set([
  "ai",
  "machine learning",
  "ml",
  "nlp",
  "llm",
  "generative ai",
  "data science",
  "computer vision",
  "deep learning",
  "mlops",
  "pytorch",
  "tensorflow",
  "langchain",
  "agents",
  "rag",
]);

function inferLevel(title: string, tags: string[], job_type: string): ExperienceLevel {
  const t = `${title} ${tags.join(" ")} ${job_type}`.toLowerCase();
  if (/(intern|junior|entry|graduate|new grad|jr\.|trainee)/.test(t)) return "beginner";
  if (/(senior|staff|principal|lead|sr\.)/.test(t)) return "advanced";
  return "intermediate";
}

function inferDomains(title: string, tags: string[]): string[] {
  const t = `${title} ${tags.join(" ")}`.toLowerCase();
  const out = new Set<string>();
  if (/(agent|langchain|llm orchestr)/.test(t)) out.add("Agentic AI");
  if (/(nlp|llm|gpt|language)/.test(t)) out.add("NLP / LLMs");
  if (/(vision|cv|image|detection|segmentation)/.test(t)) out.add("Computer Vision");
  if (/(mlops|infra|pipeline)/.test(t)) out.add("MLOps");
  if (/(data scien|analyt)/.test(t)) out.add("Data Science");
  if (out.size === 0) out.add("AI general");
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
  const t = `${j.title} ${j.category} ${j.tags.join(" ")}`.toLowerCase();
  if ([...AI_TAGS].some((kw) => t.includes(kw))) return true;
  if (j.category && j.category.toLowerCase().includes("data")) return true;
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
    domains: inferDomains(j.title, j.tags),
  };
}

export async function fetchRemotiveJobs(
  queries: string[],
  perQuery = 25,
): Promise<RemotiveJobSeed[]> {
  const out: RemotiveJobSeed[] = [];
  const seenUrls = new Set<string>();
  const seenIds = new Set<number>();

  // Always include the "ai" category as a base, then a couple of search queries
  const buckets: Array<{ params: URLSearchParams }> = [
    { params: new URLSearchParams({ category: "software-dev", limit: String(perQuery) }) },
    { params: new URLSearchParams({ search: "ai", limit: String(perQuery) }) },
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
