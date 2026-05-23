import { z } from "zod";
import { llmCall } from "@/lib/llm/client";
import type { EmailAnalysis, EmailCategory } from "@/types";

const emailAnalysisSchema = z.object({
  isCareerRelated: z.boolean(),
  emailType: z.string(),
  category: z.enum([
    "interview",
    "job reply",
    "event",
    "hackathon",
    "scholarship",
    "course",
    "networking",
    "other",
  ]),
  careerValueScore: z.number().min(0).max(100),
  recommendation: z.enum(["follow", "maybe", "ignore"]),
  urgency: z.enum(["low", "medium", "high"]),
  deadline: z.string().optional(),
  summary: z.string(),
  whyItMatters: z.string(),
  estimatedEffort: z.string(),
  suggestedActions: z.array(z.string()),
  extractedInterview: z.object({
    hasInterview: z.boolean(),
    company: z.string().optional(),
    role: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    locationOrMeetingLink: z.string().optional(),
    prepRequirements: z.array(z.string()).optional(),
  }),
});

const KEYWORDS: Record<EmailCategory, string[]> = {
  interview: ["interview", "schedule a call", "phone screen", "onsite", "panel"],
  "job reply": ["application", "thank you for applying", "unfortunately", "moving forward", "offer"],
  event: ["event", "meetup", "workshop", "webinar", "conference", "rsvp"],
  hackathon: ["hackathon", "devpost", "team formation"],
  scholarship: ["scholarship", "bursary", "award"],
  course: ["course", "module", "lesson", "certificate", "enrollment"],
  networking: ["networking", "coffee chat", "mentor", "intro call"],
  other: [],
};

function detectCategory(text: string): EmailCategory {
  const t = text.toLowerCase();
  let best: { cat: EmailCategory; hits: number } = { cat: "other", hits: 0 };
  for (const [cat, kws] of Object.entries(KEYWORDS) as [EmailCategory, string[]][]) {
    const hits = kws.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0);
    if (hits > best.hits) best = { cat, hits };
  }
  return best.cat;
}

function extractInterview(text: string, sender: string) {
  const lower = text.toLowerCase();
  const hasInterview = /interview|phone screen|video call|chat with/i.test(text);
  if (!hasInterview) return { hasInterview: false };

  // Extract date like "June 12, 2026" or "06/12/2026" or "2026-06-12"
  const monthRe = /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})/i;
  const isoRe = /(20\d{2}-\d{2}-\d{2})/;
  const slashRe = /(\d{1,2}\/\d{1,2}\/(?:20)?\d{2})/;
  let date: string | undefined;
  const m = text.match(monthRe);
  if (m) {
    const parsed = new Date(`${m[0]} 00:00:00`);
    if (!isNaN(parsed.getTime())) date = parsed.toISOString().slice(0, 10);
  }
  if (!date) {
    const i = text.match(isoRe);
    if (i) date = i[1];
  }
  if (!date) {
    const s = text.match(slashRe);
    if (s) {
      const parsed = new Date(s[1]);
      if (!isNaN(parsed.getTime())) date = parsed.toISOString().slice(0, 10);
    }
  }

  const timeMatch = text.match(/(\d{1,2}:\d{2}\s?(?:am|pm)?(?:\s?(?:MDT|MST|EDT|EST|PT|PDT|UTC))?)/i);
  const time = timeMatch ? timeMatch[1] : undefined;

  const linkMatch = text.match(/https?:\/\/[^\s)]+/);
  const link = linkMatch ? linkMatch[0] : undefined;

  // Role: look for "for the X role" or "X role at" or "X Intern"
  let role: string | undefined;
  const r1 = text.match(/for the ([^\.\n]+?) (?:role|position|internship)/i);
  if (r1) role = r1[1].trim();
  if (!role) {
    const r2 = text.match(/([A-Z][\w\s]+?(?:Intern|Engineer|Developer|Analyst|Scientist)(?:\s+Intern)?)/);
    if (r2) role = r2[1].trim();
  }

  // Company: from sender domain
  let company: string | undefined;
  const senderDom = sender.split("@")[1] || "";
  if (senderDom) {
    company = senderDom.split(".")[0].replace(/^recruiting|talent|hr|noreply/i, "").trim();
    if (!company) company = senderDom.split(".")[0];
    company = company.charAt(0).toUpperCase() + company.slice(1);
  }
  // Override if "at X" pattern exists
  const atCompany = text.match(/(?:at|with)\s+([A-Z][A-Za-z0-9& ]+)/);
  if (atCompany) company = atCompany[1].trim().split(/\s/).slice(0, 3).join(" ");

  const prep: string[] = [];
  if (/leetcode|coding|exercise|technical/i.test(text)) prep.push("Practice coding problems");
  if (/langchain|tool calling|rag/i.test(lower)) prep.push("Review LangChain tool calling + RAG");
  if (/python|project/i.test(lower)) prep.push("Prepare to walk through a past Python project");
  if (/behavioral|culture|team/i.test(lower)) prep.push("Prepare 3 STAR-format behavioral stories");
  if (prep.length === 0) prep.push("Research the company and role", "Prepare 3 thoughtful questions");

  return {
    hasInterview: true,
    company,
    role,
    date,
    time,
    locationOrMeetingLink: link,
    prepRequirements: prep,
  };
}

function mockAnalyze(input: {
  subject: string;
  sender: string;
  body: string;
}): EmailAnalysis {
  const text = `${input.subject}\n${input.body}`;
  const category = detectCategory(text);
  const interview = extractInterview(text, input.sender);
  const isCareerRelated = category !== "other" || /career|portfolio|resume|interview|job/i.test(text);

  let score = 0;
  if (category === "interview") score = 95;
  else if (category === "job reply") score = /unfortunately|other candidates/i.test(text) ? 35 : 75;
  else if (category === "hackathon") score = 85;
  else if (category === "event") score = 75;
  else if (category === "networking") score = 80;
  else if (category === "scholarship") score = 80;
  else if (category === "course") score = 60;
  else score = 30;

  const recommendation: EmailAnalysis["recommendation"] =
    score >= 75 ? "follow" : score >= 50 ? "maybe" : "ignore";
  const urgency: EmailAnalysis["urgency"] =
    interview.hasInterview && interview.date
      ? "high"
      : /this week|tomorrow|today|friday|monday/i.test(text)
        ? "medium"
        : "low";

  const summary = input.subject;
  const whyItMatters =
    category === "interview"
      ? "An interview is the highest-value career action. Prep early."
      : category === "hackathon"
        ? "Hackathons are portfolio gold and great for networking."
        : category === "job reply"
          ? score >= 75
            ? "Positive job reply — follow up promptly."
            : "Rejection. Log it and move on; track patterns over time."
          : category === "networking"
            ? "Networking compounds; reply within 24h."
            : "Worth a quick triage.";

  const suggestedActions: string[] = [];
  if (interview.hasInterview) {
    suggestedActions.push("Confirm interview slot");
    suggestedActions.push("Schedule prep blocks");
    suggestedActions.push("Research interviewer / team");
  } else if (category === "event" || category === "hackathon") {
    suggestedActions.push("RSVP / register");
    suggestedActions.push("Add to calendar");
  } else if (category === "networking") {
    suggestedActions.push("Reply within 24h");
    suggestedActions.push("Suggest 2 time options");
  } else {
    suggestedActions.push("Triage and archive");
  }

  return {
    isCareerRelated,
    emailType: category === "other" ? "general" : category,
    category,
    careerValueScore: score,
    recommendation,
    urgency,
    deadline: interview.date,
    summary,
    whyItMatters,
    estimatedEffort: interview.hasInterview ? "2-3 hours of prep" : "5-15 minutes",
    suggestedActions,
    extractedInterview: {
      hasInterview: interview.hasInterview,
      company: interview.company,
      role: interview.role,
      date: interview.date,
      time: interview.time,
      locationOrMeetingLink: interview.locationOrMeetingLink,
      prepRequirements: interview.prepRequirements,
    },
  };
}

export async function runEmailAgent(input: {
  subject: string;
  sender: string;
  body: string;
}): Promise<EmailAnalysis> {
  const mock = () => mockAnalyze(input);
  return llmCall({
    schema: emailAnalysisSchema,
    system:
      "You analyze emails for an AI student to surface career opportunities and interviews. Return strict JSON matching the schema. If you detect an interview, extract company, role, date (YYYY-MM-DD), time, location/meeting link, and prep requirements.",
    user: `Subject: ${input.subject}
From: ${input.sender}
Body:
${input.body}`,
    maxTokens: 600,
    mock,
  });
}
