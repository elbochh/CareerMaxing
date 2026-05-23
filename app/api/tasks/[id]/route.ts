import { NextRequest, NextResponse } from "next/server";
import { setTaskStatus } from "@/lib/db/repos";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const body = await req.json();
  const status = body.status === "done" ? "done" : "todo";
  await setTaskStatus(ctx.params.id, status);
  return NextResponse.json({ ok: true, status });
}
