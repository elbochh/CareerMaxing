import { addDays, format, parseISO, startOfWeek } from "date-fns";
import type {
  CoursePayload,
  EmailAnalysis,
  EventPayload,
  JobPayload,
  TaskCategory,
  TaskDoc,
  UserProfile,
  Weekday,
} from "@/types";

const WEEKDAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function weekStartFor(date: Date = new Date()): string {
  const d = startOfWeek(date, { weekStartsOn: 1 });
  return format(d, "yyyy-MM-dd");
}

interface BusyMap {
  [day: string]: number; // minutes already used
}

interface SchedulerContext {
  profile: UserProfile;
  busy: BusyMap;
  perDayLimitMin: number;
  weeklyLimitMin: number;
  totalUsed: number;
  weekStart: string;
}

function scheduleCtx(profile: UserProfile, existingTasks: TaskDoc[], weekStart: string): SchedulerContext {
  const weeklyLimitMin = Math.max(30, profile.weeklyHours * 60);
  const perDayLimitMin = Math.ceil(weeklyLimitMin / 7) + 60;
  const busy: BusyMap = {};
  let total = 0;
  for (const d of WEEKDAYS) busy[d] = 0;
  // Pre-fill busy from school schedule (heuristic: each block reserves its hours)
  for (const slot of profile.schedule || []) {
    const minutes = Math.max(0, (slot.endHour - slot.startHour) * 60);
    busy[slot.day] = (busy[slot.day] || 0) + minutes;
  }
  for (const t of existingTasks) {
    busy[t.day] = (busy[t.day] || 0) + t.estimatedMinutes;
    total += t.estimatedMinutes;
  }
  return { profile, busy, perDayLimitMin, weeklyLimitMin, totalUsed: total, weekStart };
}

interface CandidateTask {
  title: string;
  category: TaskCategory;
  estimatedMinutes: number;
  xp: number;
  preferredDay?: Weekday;
  dueDate?: string;
  hardDay?: Weekday;
}

function placeTask(ctx: SchedulerContext, t: CandidateTask): Weekday {
  if (t.hardDay) return t.hardDay;
  if (t.preferredDay) {
    if ((ctx.busy[t.preferredDay] || 0) + t.estimatedMinutes <= ctx.perDayLimitMin)
      return t.preferredDay;
  }
  let best: Weekday = "Mon";
  let bestLoad = Infinity;
  for (const d of WEEKDAYS) {
    const load = ctx.busy[d] || 0;
    if (load < bestLoad) {
      best = d;
      bestLoad = load;
    }
  }
  return best;
}

function commit(ctx: SchedulerContext, t: CandidateTask, day: Weekday, sourceOpportunityId?: string, sourceEmailId?: string): Omit<TaskDoc, "_id"> {
  ctx.busy[day] = (ctx.busy[day] || 0) + t.estimatedMinutes;
  ctx.totalUsed += t.estimatedMinutes;
  return {
    userId: ctx.profile.userId,
    weekStart: ctx.weekStart,
    day,
    title: t.title,
    category: t.category,
    estimatedMinutes: t.estimatedMinutes,
    xp: t.xp,
    sourceOpportunityId,
    sourceEmailId,
    dueDate: t.dueDate,
    status: "todo",
    createdAt: new Date().toISOString(),
  };
}

function dayFromDate(date: string): Weekday {
  const d = parseISO(date);
  const idx = (d.getUTCDay() + 6) % 7; // Mon=0
  return WEEKDAYS[idx];
}

function applyIntensity(tasks: CandidateTask[], intensity: "light" | "standard" | "full"): CandidateTask[] {
  if (intensity === "light") return tasks.slice(0, Math.max(1, Math.ceil(tasks.length / 2)));
  if (intensity === "full") return tasks;
  return tasks; // standard
}

// ---------------- Builders ----------------
function jobTasks(p: JobPayload): CandidateTask[] {
  return [
    { title: `Tailor resume for ${p.company} - ${p.title}`, category: "resume", estimatedMinutes: 45, xp: 30 },
    { title: `Write 4-sentence cover note for ${p.company}`, category: "job_application", estimatedMinutes: 25, xp: 20 },
    { title: `Submit application: ${p.title} @ ${p.company}`, category: "job_application", estimatedMinutes: 20, xp: 30, preferredDay: "Wed" },
    { title: `Follow up on ${p.company} application`, category: "follow_up", estimatedMinutes: 10, xp: 10, preferredDay: "Fri" },
  ];
}

function eventTasks(p: EventPayload): CandidateTask[] {
  const tasks: CandidateTask[] = [
    { title: `Register for ${p.title}`, category: "event", estimatedMinutes: 10, xp: 10 },
  ];
  for (const prep of p.suggestedPrep.slice(0, 3)) {
    tasks.push({ title: prep, category: p.eventType === "hackathon" || p.eventType === "competition" ? "portfolio" : "networking", estimatedMinutes: 30, xp: 15 });
  }
  // pin to event day if within week
  const evDay = dayFromDate(p.date);
  tasks.push({ title: `Attend: ${p.title}`, category: "event", estimatedMinutes: 90, xp: 40, hardDay: evDay, dueDate: p.date });
  return tasks;
}

function courseTasks(p: CoursePayload): CandidateTask[] {
  return [
    { title: `Start: ${p.title}`, category: "learning", estimatedMinutes: 30, xp: 15, preferredDay: "Mon" },
    ...p.suggestedLearningTasks.slice(0, 3).map<CandidateTask>((t) => ({
      title: t,
      category: "learning",
      estimatedMinutes: 45,
      xp: 20,
    })),
  ];
}

function emailTasks(a: EmailAnalysis): CandidateTask[] {
  const tasks: CandidateTask[] = [];
  if (a.extractedInterview.hasInterview && a.extractedInterview.date) {
    const interviewDate = a.extractedInterview.date;
    const evDay = dayFromDate(interviewDate);
    // Prep tasks scheduled earlier in week
    const prep = a.extractedInterview.prepRequirements || [
      "Research company and role",
      "Prepare 3 questions",
      "Mock interview run-through",
    ];
    for (const p of prep.slice(0, 4)) {
      tasks.push({ title: p, category: "interview_practice", estimatedMinutes: 45, xp: 25, dueDate: interviewDate });
    }
    tasks.push({
      title: `Interview: ${a.extractedInterview.company || "Company"} - ${a.extractedInterview.role || "Role"}`,
      category: "interview_practice",
      estimatedMinutes: 60,
      xp: 80,
      hardDay: evDay,
      dueDate: interviewDate,
    });
  } else {
    for (const action of a.suggestedActions.slice(0, 3)) {
      tasks.push({ title: action, category: "career_admin", estimatedMinutes: 20, xp: 10 });
    }
  }
  return tasks;
}

// ---------------- Public API ----------------
export interface BuildTasksInput {
  profile: UserProfile;
  existingTasks: TaskDoc[];
  intensity?: "light" | "standard" | "full";
  source:
    | { type: "job"; opportunityId: string; payload: JobPayload }
    | { type: "event"; opportunityId: string; payload: EventPayload }
    | { type: "course"; opportunityId: string; payload: CoursePayload }
    | { type: "email"; emailId: string; analysis: EmailAnalysis };
}

export interface BuildTasksResult {
  tasks: Omit<TaskDoc, "_id">[];
  totalEstimatedMinutes: number;
  weeklyFocus: string;
  reason: string;
}

export function buildTasksForApproved(input: BuildTasksInput): BuildTasksResult {
  const intensity = input.intensity || "standard";
  const weekStart = weekStartFor();
  const ctx = scheduleCtx(input.profile, input.existingTasks, weekStart);

  let candidates: CandidateTask[] = [];
  let weeklyFocus = "";
  let reason = "";
  switch (input.source.type) {
    case "job":
      candidates = applyIntensity(jobTasks(input.source.payload), intensity);
      weeklyFocus = `Apply: ${input.source.payload.company}`;
      reason = `Tasks generated for ${input.source.payload.title} at ${input.source.payload.company}.`;
      break;
    case "event":
      candidates = applyIntensity(eventTasks(input.source.payload), intensity);
      weeklyFocus = `Attend: ${input.source.payload.title}`;
      reason = `Tasks generated for ${input.source.payload.title}.`;
      break;
    case "course":
      candidates = applyIntensity(courseTasks(input.source.payload), intensity);
      weeklyFocus = `Study: ${input.source.payload.title}`;
      reason = `Tasks generated for ${input.source.payload.title}.`;
      break;
    case "email":
      candidates = applyIntensity(emailTasks(input.source.analysis), intensity);
      weeklyFocus = input.source.analysis.extractedInterview.hasInterview
        ? `Interview prep: ${input.source.analysis.extractedInterview.company || ""}`.trim()
        : "Inbox follow-ups";
      reason = "Tasks generated from email.";
      break;
  }

  const out: Omit<TaskDoc, "_id">[] = [];
  for (const c of candidates) {
    if (ctx.totalUsed + c.estimatedMinutes > ctx.weeklyLimitMin && intensity !== "full") {
      // skip if would blow weekly budget unless intensity is full
      continue;
    }
    const day = placeTask(ctx, c);
    const oppId =
      input.source.type !== "email" ? input.source.opportunityId : undefined;
    const emailId = input.source.type === "email" ? input.source.emailId : undefined;
    out.push(commit(ctx, c, day, oppId, emailId));
  }
  const total = out.reduce((n, t) => n + t.estimatedMinutes, 0);
  return { tasks: out, totalEstimatedMinutes: total, weeklyFocus, reason };
}
