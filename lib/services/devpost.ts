/**
 * Free, no-key event source: Devpost hackathons API (public, no auth).
 * Falls back to a tiny RSS-style parse if the JSON shape changes.
 */
import type { EventSubtype } from "@/types";

export interface DevpostEventSeed {
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

interface DevpostApiHackathon {
  id: number;
  title: string;
  url: string;
  open_state?: string;
  submission_period_dates?: string;
  thumbnail_url?: string;
  themes?: { id: number; name: string }[];
  prize_amount?: string;
  registrations_count?: number;
  organization_name?: string;
  displayed_location?: { location: string };
  start_a_submission_url?: string;
  is_online?: boolean;
}

const API = "https://devpost.com/api/hackathons";

function parseDate(s?: string): string {
  if (!s) return new Date(Date.now() + 14 * 86400_000).toISOString();
  // "Aug 15 - Sep 30, 2026"  →  use the end as the deadline-ish anchor
  const m =
    s.match(/[A-Za-z]+\s+\d{1,2}\s*-\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})/) ||
    s.match(/([A-Za-z]+\s+\d{1,2},\s*\d{4})/);
  if (m && m[1]) {
    const d = new Date(m[1]);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      return d.toISOString();
    }
  }
  return new Date(Date.now() + 14 * 86400_000).toISOString();
}

function inferDomains(themes: string[]): string[] {
  const t = themes.join(" ").toLowerCase();
  const out = new Set<string>();
  if (/(ai|machine learn|ml|llm|generative)/.test(t)) out.add("AI general");
  if (/(agent)/.test(t)) out.add("Agentic AI");
  if (/(nlp|language)/.test(t)) out.add("NLP / LLMs");
  if (/(vision|image)/.test(t)) out.add("Computer Vision");
  if (/(data)/.test(t)) out.add("Data Science");
  if (out.size === 0) out.add("AI general");
  return Array.from(out);
}

function stripHtml(s: string | undefined): string | undefined {
  if (!s) return undefined;
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function map(h: DevpostApiHackathon): DevpostEventSeed {
  const themes = (h.themes || []).map((t) => t.name);
  const isOnline =
    h.is_online === true ||
    (h.displayed_location?.location || "").toLowerCase().includes("online");
  return {
    title: stripHtml(h.title) || h.title,
    eventType: "hackathon",
    organizer: stripHtml(h.organization_name) || "Devpost",
    date: parseDate(h.submission_period_dates),
    location: stripHtml(h.displayed_location?.location) || (isOnline ? "Online" : "TBD"),
    isOnline,
    source: "Devpost",
    url: h.url.startsWith("http") ? h.url : `https://devpost.com${h.url}`,
    tags: themes.slice(0, 8),
    domains: inferDomains(themes),
    likelyTopics: themes.slice(0, 6),
    prizes: stripHtml(h.prize_amount),
    evaluationCriteria: "Originality, technical execution, demo quality, and impact.",
  };
}

export async function fetchDevpostHackathons(): Promise<DevpostEventSeed[]> {
  try {
    const url = `${API}?status[]=upcoming&status[]=open&order_by=deadline`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { hackathons?: DevpostApiHackathon[] };
    const items = data.hackathons || [];
    return items.slice(0, 40).map(map);
  } catch (err) {
    console.warn("[devpost] fetch failed:", (err as Error).message);
    return [];
  }
}
