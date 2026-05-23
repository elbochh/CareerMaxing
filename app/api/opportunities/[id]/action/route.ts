import { NextRequest, NextResponse } from "next/server";
import {
  getOpportunity,
  getProfile,
  insertTasks,
  listTasksForWeek,
  updateOpportunityStatus,
} from "@/lib/db/repos";
import { buildTasksForApproved, weekStartFor } from "@/lib/agents/checklist";
import { DEFAULT_USER_ID, type CoursePayload, type EventPayload, type JobPayload } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const body = await req.json();
  const action = body.action as "follow" | "ignore" | "save";
  const intensity = (body.intensity || "standard") as "light" | "standard" | "full";

  const opp = await getOpportunity(ctx.params.id);
  if (!opp) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (action === "ignore") {
    await updateOpportunityStatus(opp._id!, "ignored");
    return NextResponse.json({ ok: true, status: "ignored" });
  }
  if (action === "save") {
    await updateOpportunityStatus(opp._id!, "saved");
    return NextResponse.json({ ok: true, status: "saved" });
  }
  // follow
  const profile = await getProfile(DEFAULT_USER_ID);
  if (!profile) return NextResponse.json({ error: "profile_missing" }, { status: 400 });
  const weekStart = weekStartFor();
  const existing = await listTasksForWeek(DEFAULT_USER_ID, weekStart);

  let source;
  if (opp.kind === "job") {
    source = { type: "job" as const, opportunityId: opp._id!, payload: opp.payload as JobPayload };
  } else if (opp.kind === "event") {
    source = { type: "event" as const, opportunityId: opp._id!, payload: opp.payload as EventPayload };
  } else {
    source = { type: "course" as const, opportunityId: opp._id!, payload: opp.payload as CoursePayload };
  }

  const result = buildTasksForApproved({
    profile,
    existingTasks: existing,
    intensity,
    source,
  });
  await updateOpportunityStatus(opp._id!, "approved");
  const inserted = await insertTasks(result.tasks);
  return NextResponse.json({
    ok: true,
    status: "approved",
    tasksAdded: inserted.length,
    weeklyFocus: result.weeklyFocus,
    totalEstimatedMinutes: result.totalEstimatedMinutes,
  });
}
