import type { ExperienceLevel, LocationPref } from "@/types";

interface JobicyJob {
  id?: number;
  url?: string;
  jobTitle?: string;
  companyName?: string;
  jobIndustry?: string[];
  jobType?: string[];
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
}

interface JobicyResponse {
  jobs?: JobicyJob[];
}

export interface JobicyJobSeed {
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

const BASE = "https://jobicy.com/api/v2/remote-jobs";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function inferLevel(job: JobicyJob): ExperienceLevel {
  const blob = [job.jobTitle, job.jobLevel].join(" ").toLowerCase();
  if (/\b(intern|junior|entry|graduate|new grad|associate)\b/.test(blob)) return "beginner";
  if (/\b(senior|staff|lead|principal|manager|director|head)\b/.test(blob)) return "advanced";
  return "intermediate";
}

function looksAi(job: JobicyJob): boolean {
  const blob = [
    job.jobTitle,
    job.jobExcerpt,
    job.jobDescription,
    ...(job.jobIndustry || []),
  ]
    .join(" ")
    .toLowerCase();
  return /\b(ai|artificial intelligence|machine learning|ml|llm|generative|data science|data scientist|analytics|python|pytorch|tensorflow|computer vision|agentic)\b/.test(
    blob,
  );
}

function inferDomains(job: JobicyJob): string[] {
  const blob = [job.jobTitle, job.jobExcerpt, ...(job.jobIndustry || [])].join(" ").toLowerCase();
  const domains = new Set<string>(["AI general"]);
  if (blob.includes("machine learning") || /\bml\b/.test(blob)) domains.add("Machine Learning");
  if (blob.includes("data science") || blob.includes("analytics")) domains.add("Data Science");
  if (blob.includes("generative") || blob.includes("llm")) domains.add("Generative AI");
  if (blob.includes("computer vision")) domains.add("Computer Vision");
  if (blob.includes("product")) domains.add("AI Product");
  return Array.from(domains);
}

function map(job: JobicyJob): JobicyJobSeed | null {
  const title = job.jobTitle?.trim();
  const company = job.companyName?.trim();
  const url = job.url?.trim();
  if (!title || !company || !url) return null;
  const tags = (job.jobIndustry || []).map(stripHtml).slice(0, 12);
  return {
    title,
    company,
    location: job.jobGeo ? `Remote ${job.jobGeo}` : "Remote Canada",
    isRemote: true,
    level: inferLevel(job),
    source: "Jobicy",
    url,
    description: stripHtml(job.jobExcerpt || job.jobDescription || "").slice(0, 600),
    tags,
    requiredSkills: tags.slice(0, 6),
    niceToHaveSkills: tags.slice(6, 10),
    domains: inferDomains(job),
  };
}

function wantsCanada(locations: LocationPref[]): boolean {
  const locs = locations.map((loc) => loc.toLowerCase());
  return locs.includes("canada") || locs.includes("alberta") || locs.includes("calgary");
}

export async function fetchJobicyJobs(locations: LocationPref[]): Promise<JobicyJobSeed[]> {
  if (!wantsCanada(locations)) return [];
  const params = new URLSearchParams({ count: "100", geo: "canada" });
  const out: JobicyJobSeed[] = [];
  const seen = new Set<string>();
  try {
    const res = await fetch(`${BASE}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CareerMaxing/1.0",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as JobicyResponse;
    for (const job of data.jobs || []) {
      if (!looksAi(job)) continue;
      const mapped = map(job);
      if (!mapped || seen.has(mapped.url)) continue;
      seen.add(mapped.url);
      out.push(mapped);
      if (out.length >= 30) return out;
    }
  } catch (err) {
    console.warn("[jobicy] fetch failed:", (err as Error).message);
  }
  return out;
}
