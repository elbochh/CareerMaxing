import { getOpportunity } from "@/lib/db/repos";
import type { TaskDoc } from "@/types";

export async function filterTasksWithVerifiedOpportunitySources(
  tasks: TaskDoc[],
): Promise<TaskDoc[]> {
  const out: TaskDoc[] = [];
  let hidden = 0;

  for (const task of tasks) {
    if (!task.sourceOpportunityId) {
      out.push(task);
      continue;
    }

    const opportunity = await getOpportunity(task.sourceOpportunityId);
    if (opportunity?.isVerified === true) {
      out.push(task);
    } else {
      hidden += 1;
    }
  }

  if (hidden > 0) {
    console.warn(`[checklist] hidden_unverified_source_tasks=${hidden}`);
  }

  return out;
}
