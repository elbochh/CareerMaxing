import { NextRequest, NextResponse } from "next/server";
import { getProfile, upsertProfile } from "@/lib/db/repos";
import { requireUserId, unauthorizedResponse } from "@/lib/auth-helpers";
import type { UserProfile } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireUserId();
    const profile = await getProfile(userId);
    return NextResponse.json({ profile });
  } catch {
    return unauthorizedResponse();
  }
}

export async function PUT(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return unauthorizedResponse();
  }
  const body = (await req.json()) as Partial<UserProfile>;
  if (!body.name || !body.primaryDomain || !body.level) {
    return NextResponse.json({ error: "name, level, primaryDomain are required" }, { status: 400 });
  }
  const profile: UserProfile = {
    userId,
    name: body.name,
    school: body.school || "",
    level: body.level,
    primaryDomain: body.primaryDomain,
    locations: body.locations && body.locations.length > 0 ? body.locations : ["Calgary", "Remote"],
    opportunityTypes:
      body.opportunityTypes && body.opportunityTypes.length > 0
        ? body.opportunityTypes
        : ["jobs", "hackathons", "courses"],
    weeklyHours: typeof body.weeklyHours === "number" ? body.weeklyHours : 8,
    schedule: body.schedule || [],
    skills: body.skills || [],
    careerGoals: body.careerGoals && body.careerGoals.length > 0 ? body.careerGoals : ["get internship"],
  };
  const saved = await upsertProfile(profile);
  return NextResponse.json({ profile: saved });
}
