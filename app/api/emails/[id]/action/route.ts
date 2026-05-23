import { NextRequest, NextResponse } from "next/server";
import {
  getEmail,
  getProfile,
  insertTasks,
  listTasksForWeek,
  updateEmailStatus,
} from "@/lib/db/repos";
import { buildTasksForApproved, weekStartFor } from "@/lib/agents/checklist";
import { DEFAULT_USER_ID } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const body = await req.json();
  const action = body.action as "follow" | "ignore" | "save";
  const intensity = (body.intensity || "standard") as "light" | "standard" | "full";

  const email = await getEmail(ctx.params.id);
  if (!email) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (action === "ignore") {
    await updateEmailStatus(email._id!, "ignored");
    return NextResponse.json({ ok: true, status: "ignored" });
  }
  if (action === "save") {
    await updateEmailStatus(email._id!, "saved");
    return NextResponse.json({ ok: true, status: "saved" });
  }
  const profile = await getProfile(DEFAULT_USER_ID);
  if (!profile) return NextResponse.json({ error: "profile_missing" }, { status: 400 });
  const weekStart = weekStartFor();
  const existing = await listTasksForWeek(DEFAULT_USER_ID, weekStart);
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
