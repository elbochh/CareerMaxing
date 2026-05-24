export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type PrimaryDomain =
  | "AI general"
  | "Agentic AI"
  | "Machine Learning"
  | "Data Science"
  | "Generative AI"
  | "NLP"
  | "Computer Vision"
  | "AI Automation"
  | "MLOps"
  | "AI Product";

export type LocationPref = "Calgary" | "Alberta" | "Canada" | "Remote" | "Online";

export type OpportunityType =
  | "jobs"
  | "internships"
  | "hackathons"
  | "networking events"
  | "competitions"
  | "courses"
  | "certificates";

export type CareerGoal =
  | "get internship"
  | "build portfolio"
  | "learn AI"
  | "network"
  | "prepare for interviews"
  | "find hackathons";

export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface ScheduleSlot {
  day: Weekday;
  startHour: number; // 0-23
  endHour: number; // 0-23
  label?: string;
}

export interface UserProfile {
  userId: string;
  name: string;
  school?: string;
  level: ExperienceLevel;
  primaryDomain: PrimaryDomain;
  locations: LocationPref[];
  opportunityTypes: OpportunityType[];
  weeklyHours: number;
  schedule: ScheduleSlot[];
  skills: string[];
  careerGoals: CareerGoal[];
  updatedAt?: string;
}

export interface DomainExpansion {
  userId: string;
  primaryDomain: PrimaryDomain;
  profileFingerprint?: string;
  expandedSubfields: string[];
  jobSearchQueries: string[];
  eventSearchQueries: string[];
  learningSearchQueries: string[];
  jobTitles: string[];
  createdAt: string;
}

export interface AgentScanContext {
  profileFingerprint: string;
  scanId: string;
}

export type ScoreBand = "strong" | "good" | "maybe" | "ignore";
export type OpportunityKind = "job" | "event" | "course";
export type OpportunityStatus = "new" | "saved" | "approved" | "ignored";

export type EventSubtype =
  | "hackathon"
  | "competition"
  | "networking"
  | "workshop"
  | "meetup"
  | "conference"
  | "webinar"
  | "career fair";

export interface JobPayload {
  title: string;
  company: string;
  location: string;
  source: string;
  url: string;
  description?: string;
  level: ExperienceLevel | "any";
  isRemote?: boolean;
  difficulty: ExperienceLevel;
  matchedSkills: string[];
  missingSkills: string[];
  resumeKeywords: string[];
  whyUseful: string;
  recommendedAction: string;
}

export interface EventPayload {
  title: string;
  eventType: EventSubtype;
  organizer: string;
  date: string; // ISO
  location: string;
  isOnline: boolean;
  source: string;
  url: string;
  networkingValue: number; // 0-100
  portfolioValue: number; // 0-100
  urgency: "low" | "medium" | "high";
  detailedDescription: string;
  likelyTopics?: string[];
  likelyAttendees?: string[];
  prizes?: string;
  evaluationCriteria?: string;
  whyUseful: string;
  suggestedPrep: string[];
  suggestedProjectAngle?: string;
  recommendedAction: string;
}

export interface CoursePayload {
  title: string;
  provider: string;
  level: ExperienceLevel;
  cost: "free" | "paid" | "freemium" | string;
  estimatedHours: number;
  url: string;
  bestFor: string[];
  whyUseful: string;
  suggestedLearningTasks: string[];
  recommendedAction: string;
  pathWeek?: number; // for ordered learning paths
}

export type OpportunityPayload = JobPayload | EventPayload | CoursePayload;

export interface OpportunityDoc<P = OpportunityPayload> {
  _id?: string;
  userId: string;
  kind: OpportunityKind;
  profileFingerprint?: string;
  scanId?: string;
  dedupeKey: string;
  sourceUrl: string;
  source: string;
  payload: P;
  score: number;
  scoreBand: ScoreBand;
  status: OpportunityStatus;
  createdAt: string;
  updatedAt: string;
}

export type EmailCategory =
  | "interview"
  | "job reply"
  | "event"
  | "hackathon"
  | "scholarship"
  | "course"
  | "networking"
  | "other";

export interface ExtractedInterview {
  hasInterview: boolean;
  company?: string;
  role?: string;
  date?: string;
  time?: string;
  locationOrMeetingLink?: string;
  prepRequirements?: string[];
}

export interface EmailAnalysis {
  isCareerRelated: boolean;
  emailType: string;
  category: EmailCategory;
  careerValueScore: number;
  recommendation: "follow" | "maybe" | "ignore";
  urgency: "low" | "medium" | "high";
  deadline?: string;
  summary: string;
  whyItMatters: string;
  estimatedEffort: string;
  suggestedActions: string[];
  extractedInterview: ExtractedInterview;
}

export interface EmailDoc {
  _id?: string;
  userId: string;
  dedupeKey: string;
  subject: string;
  sender: string;
  body: string;
  bodySnippet: string;
  analysis: EmailAnalysis;
  status: OpportunityStatus;
  createdAt: string;
}

export type TaskCategory =
  | "job_application"
  | "event"
  | "networking"
  | "resume"
  | "linkedin"
  | "portfolio"
  | "skill_building"
  | "interview_practice"
  | "career_admin"
  | "follow_up"
  | "learning";

export interface TaskDoc {
  _id?: string;
  userId: string;
  weekStart: string; // ISO date (Monday)
  day: Weekday;
  title: string;
  category: TaskCategory;
  estimatedMinutes: number;
  xp: number;
  sourceOpportunityId?: string;
  sourceEmailId?: string;
  dueDate?: string;
  status: "todo" | "done";
  createdAt: string;
}

export interface ScanCounts {
  jobs: { found: number; new: number };
  events: { found: number; new: number };
  courses: { found: number; new: number };
}

export const DEFAULT_USER_ID = "local-user";
