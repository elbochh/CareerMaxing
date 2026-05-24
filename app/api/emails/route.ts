import { NextResponse } from "next/server";
import { listEmails } from "@/lib/db/repos";
import { requireUserId, unauthorizedResponse } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireUserId();
    const emails = await listEmails(userId);
    return NextResponse.json({ emails });
  } catch {
    return unauthorizedResponse();
  }
}
