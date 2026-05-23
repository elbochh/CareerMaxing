import { NextRequest, NextResponse } from "next/server";
import { getProfile, upsertProfile } from "@/lib/db/repos";
import { DEFAULT_USER_ID, type UserProfile } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getProfile(DEFAULT_USER_ID);
  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as Partial<UserProfile>;
  if (!body.name || !body.primaryDomain || !body.level) {
    return NextResponse.json({ error: "name, level, primaryDomain are required" }, { status: 400 });
  }
  const profile: UserProfile = {
    userId: DEFAULT_USER_ID,
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
