import { NextRequest, NextResponse } from "next/server";
import {
  getEmail,
  insertTasks,
  listTasksForWeek,
  updateEmailStatus,
} from "@/lib/db/repos";
import { buildTasksForApproved, weekStartFor } from "@/lib/agents/checklist";
import { requireCurrentUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { getOrCreateProfileForUser } from "@/lib/profile";

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

  const email = await getEmail(ctx.params.id);
  if (!email || email.userId !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (action === "ignore") {
    await updateEmailStatus(email._id!, "ignored");
    return NextResponse.json({ ok: true, status: "ignored" });
  }
  if (action === "save") {
    await updateEmailStatus(email._id!, "saved");
    return NextResponse.json({ ok: true, status: "saved" });
  }
  const { profile } = await getOrCreateProfileForUser(user);
  const weekStart = weekStartFor();
  const existing = await listTasksForWeek(userId, weekStart);
  const result = buildTasksForApproved({
    profile,
    existingTasks: existing,
    intensity,
    source: { type: "email", emailId: email._id!, analysis: email.analysis },
  });
  await updateEmailStatus(email._id!, "approved");
  const inserted = await insertTasks(result.tasks);
  return NextResponse.json({
    ok: true,
    status: "approved",
    tasksAdded: inserted.length,
    weeklyFocus: result.weeklyFocus,
  });
}
