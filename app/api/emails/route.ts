import { NextResponse } from "next/server";
import { listEmails } from "@/lib/db/repos";
import { DEFAULT_USER_ID } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const emails = await listEmails(DEFAULT_USER_ID);
  return NextResponse.json({ emails });
}
