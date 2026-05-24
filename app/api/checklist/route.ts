import { NextRequest, NextResponse } from "next/server";
import { getProfile, listTasksForWeek } from "@/lib/db/repos";
import { weekStartFor } from "@/lib/agents/checklist";
import { requireUserId, unauthorizedResponse } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return unauthorizedResponse();
  }
  const { searchParams } = new URL(req.url);
  const week = searchParams.get("week") || weekStartFor();
  const [tasks, profile] = await Promise.all([
    listTasksForWeek(userId, week),
    getProfile(userId),
  ]);
  const totalMinutes = tasks.reduce((n, t) => n + t.estimatedMinutes, 0);
  const totalXp = tasks.reduce((n, t) => n + t.xp, 0);
  const earnedXp = tasks.filter((t) => t.status === "done").reduce((n, t) => n + t.xp, 0);
  return NextResponse.json({
    weekStart: week,
    tasks,
    totalMinutes,
    totalXp,
    earnedXp,
    schedule: profile?.schedule || [],
  });
}
