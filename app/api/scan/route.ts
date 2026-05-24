import { NextResponse } from "next/server";
import { getProfile } from "@/lib/db/repos";
import { runDomainAgent } from "@/lib/agents/domain";
import { runJobAgent } from "@/lib/agents/jobs";
import { runEventAgent } from "@/lib/agents/events";
import { runLearningAgent } from "@/lib/agents/learning";
import { requireUserId, unauthorizedResponse } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return unauthorizedResponse();
  }
  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 400 });
  }
  const domain = await runDomainAgent(profile);
  const [jobs, events, courses] = await Promise.all([
    runJobAgent(profile, domain),
    runEventAgent(profile, domain),
    runLearningAgent(profile, domain),
  ]);
  return NextResponse.json({
    domain: {
      primaryDomain: domain.primaryDomain,
      expandedSubfields: domain.expandedSubfields.slice(0, 10),
    },
    counts: {
      jobs: { found: jobs.found, new: jobs.newInserted },
      events: { found: events.found, new: events.newInserted },
      courses: { found: courses.found, new: courses.newInserted },
    },
  });
}
