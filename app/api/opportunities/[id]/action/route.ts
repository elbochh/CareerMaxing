import { NextRequest, NextResponse } from "next/server";
import {
  getOpportunity,
  insertTasks,
  listTasksForWeek,
  updateOpportunityStatus,
} from "@/lib/db/repos";
import { buildTasksForApproved, weekStartFor } from "@/lib/agents/checklist";
import { requireCurrentUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { getOrCreateProfileForUser } from "@/lib/profile";
import type { CoursePayload, EventPayload, JobPayload } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch {
    return unauthorizedResponse();
  }
  const userId = user.id;
  const body = await req.json();
  const action = body.action as "follow" | "ignore" | "save";
  const intensity = (body.intensity || "standard") as "light" | "standard" | "full";

  const opp = await getOpportunity(ctx.params.id);
  if (!opp || opp.userId !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (action === "ignore") {
    await updateOpportunityStatus(opp._id!, "ignored");
    return NextResponse.json({ ok: true, status: "ignored" });
  }
  if (action === "save") {
    await updateOpportunityStatus(opp._id!, "saved");
    return NextResponse.json({ ok: true, status: "saved" });
  }
  // follow
  if (opp.isVerified !== true) {
    return NextResponse.json(
      {
        error:
          "This item is not source-verified, so it cannot be added to the checklist.",
      },
      { status: 400 },
    );
  }
  const { profile } = await getOrCreateProfileForUser(user);
  const weekStart = weekStartFor();
  const existing = await listTasksForWeek(userId, weekStart);

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
