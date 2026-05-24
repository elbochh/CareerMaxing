import { createHash } from "crypto";
import { getProfile, upsertProfile } from "@/lib/db/repos";
import type { CareerGoal, LocationPref, OpportunityType, UserProfile } from "@/types";

export interface CurrentUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

function sortedLower(values: string[] | undefined): string[] {
  return [...(values || [])].map((v) => v.trim().toLowerCase()).filter(Boolean).sort();
}

export function profileFingerprint(profile: UserProfile): string {
  const profileDiscoveryInputs = {
    userId: profile.userId,
    level: profile.level,
    primaryDomain: profile.primaryDomain,
    locations: sortedLower(profile.locations),
    opportunityTypes: sortedLower(profile.opportunityTypes),
    weeklyHours: profile.weeklyHours,
    skills: sortedLower(profile.skills),
    careerGoals: sortedLower(profile.careerGoals),
  };

  return createHash("sha256")
    .update(JSON.stringify(profileDiscoveryInputs))
    .digest("hex")
    .slice(0, 16);
}

function fallbackName(user: CurrentUser): string {
  if (user.name?.trim()) return user.name.trim();
  if (user.email?.includes("@")) return user.email.split("@")[0];
  return "CareerMaxer";
}

export function starterProfileForUser(user: CurrentUser): UserProfile {
  return {
    userId: user.id,
    name: fallbackName(user),
    school: "",
    level: "beginner",
    primaryDomain: "Agentic AI",
    locations: ["Calgary", "Remote"] satisfies LocationPref[],
    opportunityTypes: ["jobs", "internships", "hackathons", "courses"] satisfies OpportunityType[],
    weeklyHours: 8,
    schedule: [],
    skills: ["Python"],
    careerGoals: ["get internship", "build portfolio"] satisfies CareerGoal[],
  };
}

export async function getOrCreateProfileForUser(
  user: CurrentUser,
): Promise<{ profile: UserProfile; created: boolean }> {
  const existing = await getProfile(user.id);
  if (existing) return { profile: existing, created: false };

  const profile = await upsertProfile(starterProfileForUser(user));
  return { profile, created: true };
}
