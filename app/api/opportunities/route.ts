import { NextRequest, NextResponse } from "next/server";
import { getProfile, listOpportunities } from "@/lib/db/repos";
import { requireUserId, unauthorizedResponse } from "@/lib/auth-helpers";
import { profileFingerprint } from "@/lib/profile";
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
  const profile = await getProfile(userId);
  const fingerprint = profile ? profileFingerprint(profile) : undefined;
  const items = await listOpportunities(userId, kind, status, fingerprint);
  return NextResponse.json({ items });
}
