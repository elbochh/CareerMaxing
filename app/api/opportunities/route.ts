import { NextRequest, NextResponse } from "next/server";
import { listOpportunities } from "@/lib/db/repos";
import { requireUserId, unauthorizedResponse } from "@/lib/auth-helpers";
import type { OpportunityKind, OpportunityStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return unauthorizedResponse();
  }
  const { searchParams } = new URL(req.url);
  const kind = (searchParams.get("kind") || "job") as OpportunityKind;
  const status = (searchParams.get("status") || undefined) as OpportunityStatus | undefined;
  const items = await listOpportunities(userId, kind, status);
  return NextResponse.json({ items });
}
