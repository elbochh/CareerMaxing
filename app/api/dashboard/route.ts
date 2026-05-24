import { NextResponse } from "next/server";
import {
  countOpportunities,
  getDomainExpansion,
  getProfile,
  listAllTasks,
  listOpportunities,
} from "@/lib/db/repos";
import { weekStartFor } from "@/lib/agents/checklist";
import { requireUserId, unauthorizedResponse } from "@/lib/auth-helpers";
import { profileFingerprint } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return unauthorizedResponse();
  }
  const profile = await getProfile(userId);
  const fingerprint = profile ? profileFingerprint(profile) : undefined;
  const cachedDomain = profile ? await getDomainExpansion(userId) : null;
  const domain =
    cachedDomain && cachedDomain.profileFingerprint === fingerprint ? cachedDomain : null;

  const [jobsNew, eventsNew, coursesNew, jobsApproved, eventsApproved, coursesApproved] =
    await Promise.all([
      countOpportunities(userId, "job", "new", fingerprint),
      countOpportunities(userId, "event", "new", fingerprint),
      countOpportunities(userId, "course", "new", fingerprint),
      countOpportunities(userId, "job", "approved"),
      countOpportunities(userId, "event", "approved"),
      countOpportunities(userId, "course", "approved"),
    ]);
  const topJobs = (await listOpportunities(userId, "job", "new", fingerprint)).slice(0, 3);
  const topEvents = (await listOpportunities(userId, "event", "new", fingerprint)).slice(0, 3);
  const tasks = await listAllTasks(userId);
  const thisWeek = weekStartFor();
  const weekTasks = tasks.filter((t) => t.weekStart === thisWeek);
  const xpEarned = weekTasks.filter((t) => t.status === "done").reduce((n, t) => n + t.xp, 0);
  const xpTotal = weekTasks.reduce((n, t) => n + t.xp, 0);
  const upcoming = tasks
    .filter((t) => t.dueDate && t.status === "todo")
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
    .slice(0, 5);

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
