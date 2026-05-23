import { NextRequest, NextResponse } from "next/server";
import { listOpportunities } from "@/lib/db/repos";
import { DEFAULT_USER_ID, type OpportunityKind, type OpportunityStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kind = (searchParams.get("kind") || "job") as OpportunityKind;
  const status = (searchParams.get("status") || undefined) as OpportunityStatus | undefined;
  const items = await listOpportunities(DEFAULT_USER_ID, kind, status);
  return NextResponse.json({ items });
}
