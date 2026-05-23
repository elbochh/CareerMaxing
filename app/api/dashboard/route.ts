import { NextResponse } from "next/server";
import {
  countOpportunities,
  getDomainExpansion,
  getProfile,
  listAllTasks,
  listOpportunities,
} from "@/lib/db/repos";
import { weekStartFor } from "@/lib/agents/checklist";
import { DEFAULT_USER_ID } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getProfile(DEFAULT_USER_ID);
  const domain = profile ? await getDomainExpansion(DEFAULT_USER_ID) : null;

  const [jobsNew, eventsNew, coursesNew, jobsApproved, eventsApproved, coursesApproved] =
    await Promise.all([
      countOpportunities(DEFAULT_USER_ID, "job", "new"),
      countOpportunities(DEFAULT_USER_ID, "event", "new"),
      countOpportunities(DEFAULT_USER_ID, "course", "new"),
      countOpportunities(DEFAULT_USER_ID, "job", "approved"),
      countOpportunities(DEFAULT_USER_ID, "event", "approved"),
      countOpportunities(DEFAULT_USER_ID, "course", "approved"),
    ]);
  const topJobs = (await listOpportunities(DEFAULT_USER_ID, "job", "new")).slice(0, 3);
  const topEvents = (await listOpportunities(DEFAULT_USER_ID, "event", "new")).slice(0, 3);
  const tasks = await listAllTasks(DEFAULT_USER_ID);
  const thisWeek = weekStartFor();
  const weekTasks = tasks.filter((t) => t.weekStart === thisWeek);
  const xpEarned = weekTasks.filter((t) => t.status === "done").reduce((n, t) => n + t.xp, 0);
  const xpTotal = weekTasks.reduce((n, t) => n + t.xp, 0);
  const upcoming = tasks
    .filter((t) => t.dueDate && t.status === "todo")
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
    .slice(0, 5);

  // CareerMaxing score: weighted blend
  const cmScore = Math.round(
    Math.min(
      100,
      (jobsApproved + eventsApproved + coursesApproved) * 8 +
        (xpTotal > 0 ? (xpEarned / xpTotal) * 40 : 0) +
        Math.min(20, (jobsNew + eventsNew + coursesNew) * 1.2),
    ),
  );

  return NextResponse.json({
    profile,
    domain,
    careerMaxingScore: cmScore,
    counts: {
      jobsNew,
      eventsNew,
      coursesNew,
      jobsApproved,
      eventsApproved,
      coursesApproved,
    },
    xp: { earned: xpEarned, total: xpTotal },
    topJobs,
    topEvents,
    upcoming,
  });
}
