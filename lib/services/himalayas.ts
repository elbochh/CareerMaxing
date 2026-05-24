import type { ExperienceLevel, LocationPref } from "@/types";

interface HimalayasJob {
  title?: string;
  excerpt?: string;
  companyName?: string;
  employmentType?: string;
  seniority?: string[];
  locationRestrictions?: string[];
  categories?: string[];
  parentCategories?: string[];
  description?: string;
  applicationLink?: string;
  guid?: string;
}

interface HimalayasResponse {
  jobs?: HimalayasJob[];
}

export interface HimalayasJobSeed {
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

const BASE = "https://himalayas.app/jobs/api/search";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function inferLevel(job: HimalayasJob): ExperienceLevel {
  const blob = [job.title, ...(job.seniority || [])].join(" ").toLowerCase();
  if (/\b(intern|junior|entry|graduate|new grad|associate)\b/.test(blob)) return "beginner";
  if (/\b(senior|staff|lead|principal|manager|director|head)\b/.test(blob)) return "advanced";
  return "intermediate";
}

function looksAi(job: HimalayasJob): boolean {
  const blob = [
    job.title,
    job.excerpt,
    job.description,
    ...(job.categories || []),
    ...(job.parentCategories || []),
  ]
    .join(" ")
    .toLowerCase();
  return /\b(ai|artificial intelligence|machine learning|ml|llm|generative|data science|data scientist|nlp|python|pytorch|tensorflow|computer vision|agentic)\b/.test(
    blob,
  );
}

function inferDomains(job: HimalayasJob): string[] {
  const blob = [job.title, job.excerpt, ...(job.categories || [])].join(" ").toLowerCase();
  const domains = new Set<string>(["AI general"]);
  if (blob.includes("machine learning") || /\bml\b/.test(blob)) domains.add("Machine Learning");
  if (blob.includes("data science") || blob.includes("data scientist")) domains.add("Data Science");
  if (blob.includes("generative") || blob.includes("llm")) domains.add("Generative AI");
  if (blob.includes("nlp")) domains.add("NLP");
  if (blob.includes("computer vision")) domains.add("Computer Vision");
  if (blob.includes("mlops") || blob.includes("devops")) domains.add("MLOps");
  if (blob.includes("product")) domains.add("AI Product");
  return Array.from(domains);
}

function map(job: HimalayasJob): HimalayasJobSeed | null {
  const title = job.title?.trim();
  const company = job.companyName?.trim();
  const url = job.applicationLink || (job.guid ? `https://himalayas.app/jobs/${job.guid}` : "");
  if (!title || !company || !url) return null;
  const locationRestrictions = job.locationRestrictions || [];
  const location = locationRestrictions.length > 0 ? `Remote ${locationRestrictions.join(", ")}` : "Remote";
  const tags = Array.from(new Set([...(job.categories || []), ...(job.parentCategories || [])]))
    .map((tag) => tag.replace(/-/g, " "))
    .slice(0, 12);
  const description = stripHtml(job.excerpt || job.description || "").slice(0, 600);
  return {
    title,
    company,
    location,
    isRemote: true,
    level: inferLevel(job),
    source: "Himalayas",
    url,
    description,
    tags,
    requiredSkills: tags.slice(0, 6),
    niceToHaveSkills: tags.slice(6, 10),
    domains: inferDomains(job),
  };
}

function countryFor(locations: LocationPref[]): string | null {
  const locs = locations.map((loc) => loc.toLowerCase());
  return locs.includes("canada") || locs.includes("alberta") || locs.includes("calgary") ? "CA" : null;
}

export async function fetchHimalayasJobs(
  queries: string[],
  locations: LocationPref[],
): Promise<HimalayasJobSeed[]> {
  const country = countryFor(locations);
  if (!country) return [];
  const out: HimalayasJobSeed[] = [];
  const seen = new Set<string>();

  for (const query of queries.slice(0, 12)) {
    const params = new URLSearchParams({
      q: query,
      country,
      exclude_worldwide: "true",
      sort: "recent",
      page: "1",
    });
    try {
      const res = await fetch(`${BASE}?${params.toString()}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "CareerMaxing/1.0",
        },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json()) as HimalayasResponse;
      for (const job of data.jobs || []) {
        if (!looksAi(job)) continue;
        const mapped = map(job);
        if (!mapped || seen.has(mapped.url)) continue;
        seen.add(mapped.url);
        out.push(mapped);
        if (out.length >= 40) return out;
      }
    } catch (err) {
      console.warn("[himalayas] fetch failed:", (err as Error).message);
    }
  }
  return out;
}
