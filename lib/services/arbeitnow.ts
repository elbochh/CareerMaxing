/**
 * Free, no-key job source: https://www.arbeitnow.com/api/job-board-api
 * Used as a second verified source so the job agent is not limited by one board.
 */
import type { ExperienceLevel } from "@/types";

export interface ArbeitnowJobSeed {
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

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags?: string[];
  job_types?: string[];
  location: string;
}

interface ArbeitnowResponse {
  data?: ArbeitnowJob[];
}

const API = "https://www.arbeitnow.com/api/job-board-api";

const INCLUDE_SIGNALS = [
  "ai",
  "artificial intelligence",
  "machine learning",
  "ml",
  "data science",
  "data scientist",
  "data engineer",
  "llm",
  "nlp",
  "computer vision",
  "python",
  "pytorch",
  "tensorflow",
  "rag",
  "generative ai",
  "software engineer",
  "software developer",
  "backend",
  "frontend",
  "fullstack",
  "full-stack",
  "devops",
  "platform engineer",
  "automation",
];

const ROLE_SIGNALS = [
  "engineer",
  "developer",
  "scientist",
  "analyst",
  "architect",
  "devops",
  "software",
  "data",
  "python",
  "automation",
];

const EXCLUDE_SIGNALS = [
  "sales",
  "marketing",
  "customer support",
  "recruiter",
  "talent",
  "writer",
  "copywriter",
  "designer",
  "assistant",
  "data entry",
  "virtual assistant",
  "coordinator",
  "operations",
  "artist",
  "editor",
  "content",
];

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function inferLevel(title: string, tags: string[]): ExperienceLevel {
  const t = `${title} ${tags.join(" ")}`.toLowerCase();
  if (/(intern|junior|entry|graduate|new grad|jr\.|trainee|associate)/.test(t)) {
    return "beginner";
  }
  if (/(senior|staff|principal|lead|sr\.)/.test(t)) return "advanced";
  return "intermediate";
}

function inferDomains(title: string, tags: string[], description: string): string[] {
  const text = `${title} ${tags.join(" ")} ${description}`.toLowerCase();
  const out = new Set<string>(["AI general"]);
  if (/(agent|langchain|langgraph|rag|tool[\s-]?use|automation)/.test(text)) out.add("Agentic AI");
  if (/(nlp|llm|gpt|language|speech|voice)/.test(text)) out.add("NLP / LLMs");
  if (/(vision|computer vision|image|detection)/.test(text)) out.add("Computer Vision");
  if (/(data scien|analytics|data engineer|data processing)/.test(text)) out.add("Data Science");
  if (/(machine learning|ml|deep learning|pytorch|tensorflow)/.test(text)) out.add("Machine Learning");
  if (/(devops|platform|infrastructure|kubernetes)/.test(text)) out.add("MLOps");
  return Array.from(out);
}

function keywordHit(text: string, signals: string[]): boolean {
  return signals.some((signal) => text.includes(signal));
}

function looksRelevant(job: ArbeitnowJob): boolean {
  const tags = job.tags || [];
  const title = (job.title || "").toLowerCase();
  const text = `${title} ${tags.join(" ").toLowerCase()} ${stripHtml(job.description || "").toLowerCase()}`;
  if (keywordHit(`${title} ${tags.join(" ").toLowerCase()}`, EXCLUDE_SIGNALS)) return false;
  return keywordHit(title, ROLE_SIGNALS) && keywordHit(text, INCLUDE_SIGNALS);
}

function map(job: ArbeitnowJob): ArbeitnowJobSeed {
  const tags = (job.tags || []).filter(Boolean).slice(0, 12);
  const description = stripHtml(job.description || "").slice(0, 600);
  const derivedSkills = Array.from(
    new Set([...tags, ...INCLUDE_SIGNALS.filter((signal) => description.toLowerCase().includes(signal))]),
  ).slice(0, 10);
  return {
    title: job.title,
    company: job.company_name,
    location: job.location || (job.remote ? "Remote" : "Location not listed"),
    isRemote: Boolean(job.remote),
    level: inferLevel(job.title, tags),
    source: "Arbeitnow",
    url: job.url,
    description,
    tags: derivedSkills,
    requiredSkills: derivedSkills.slice(0, 6),
    niceToHaveSkills: derivedSkills.slice(6, 10),
    domains: inferDomains(job.title, tags, description),
  };
}

export async function fetchArbeitnowJobs(queries: string[]): Promise<ArbeitnowJobSeed[]> {
  try {
    const res = await fetch(API, {
      headers: { Accept: "application/json", "User-Agent": "CareerMaxing/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as ArbeitnowResponse;
    const queryText = queries.join(" ").toLowerCase();
    const primarySignals = INCLUDE_SIGNALS.filter((signal) => queryText.includes(signal));
    return (data.data || [])
      .filter(looksRelevant)
      .map(map)
      .sort((a, b) => {
        const aHits = a.tags.filter((tag) => primarySignals.includes(tag.toLowerCase())).length;
        const bHits = b.tags.filter((tag) => primarySignals.includes(tag.toLowerCase())).length;
        return bHits - aHits;
      })
      .slice(0, 40);
  } catch (err) {
    console.warn("[arbeitnow] fetch failed:", (err as Error).message);
    return [];
  }
}
