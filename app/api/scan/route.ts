import { NextResponse } from "next/server";
import { runDomainAgent } from "@/lib/agents/domain";
import { runJobAgent } from "@/lib/agents/jobs";
import { runEventAgent } from "@/lib/agents/events";
import { runLearningAgent } from "@/lib/agents/learning";
import { requireCurrentUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { getOrCreateProfileForUser, profileFingerprint } from "@/lib/profile";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST() {
  let user;
  try {
    user = await requireCurrentUser();
  } catch {
    return unauthorizedResponse();
  }
  const { profile, created } = await getOrCreateProfileForUser(user);
  const fingerprint = profileFingerprint(profile);
  const scanContext = {
    profileFingerprint: fingerprint,
    scanId: randomUUID(),
  };
  const domain = await runDomainAgent(profile);
  const [jobs, events, courses] = await Promise.all([
    runJobAgent(profile, domain, scanContext),
    runEventAgent(profile, domain, scanContext),
    runLearningAgent(profile, domain, scanContext),
  ]);
  return NextResponse.json({
    profile: {
      created,
      fingerprint,
      primaryDomain: profile.primaryDomain,
      level: profile.level,
      locations: profile.locations,
      skills: profile.skills,
      weeklyHours: profile.weeklyHours,
      updatedAt: profile.updatedAt,
    },
    scanId: scanContext.scanId,
    domain: {
      primaryDomain: domain.primaryDomain,
      expandedSubfields: domain.expandedSubfields.slice(0, 10),
    },
    counts: {
      jobs: {
        found: jobs.found,
        new: jobs.newInserted,
        updated: jobs.updatedExisting,
        rejected: jobs.rejected,
      },
      events: {
        found: events.found,
        new: events.newInserted,
        updated: events.updatedExisting,
        rejected: events.rejected,
      },
      courses: {
        found: courses.found,
        new: courses.newInserted,
        updated: courses.updatedExisting,
        rejected: courses.rejected,
      },
    },
  });
}
