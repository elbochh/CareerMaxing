import type { ScoreBand } from "@/types";

export function bandFor(score: number): ScoreBand {
  if (score >= 90) return "strong";
  if (score >= 70) return "good";
  if (score >= 50) return "maybe";
  return "ignore";
}

export function bandLabel(band: ScoreBand): string {
  switch (band) {
    case "strong":
      return "Strong match";
    case "good":
      return "Good match";
    case "maybe":
      return "Maybe useful";
    default:
      return "Skip";
  }
}

export function bandAction(band: ScoreBand, kind: "job" | "event" | "course"): string {
  if (band === "strong") {
    return kind === "job"
      ? "Apply this week"
      : kind === "event"
        ? "Register and prepare"
        : "Start this week";
  }
  if (band === "good") {
    return kind === "job"
      ? "Save and apply if time"
      : kind === "event"
        ? "Add to calendar"
        : "Save and start soon";
  }
  if (band === "maybe") return "Review later";
  return "Skip for now";
}

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Overlap utility used by multiple agents. */
export function skillOverlap(
  userSkills: string[],
  required: string[],
  niceToHave: string[] = [],
): { matched: string[]; missing: string[]; matchedRatio: number } {
  const lower = new Set(userSkills.map((s) => s.toLowerCase()));
  const all = [...required, ...niceToHave];
  const matched = all.filter((s) => lower.has(s.toLowerCase()));
  const missing = all.filter((s) => !lower.has(s.toLowerCase()));
  const ratio = all.length === 0 ? 0 : matched.length / all.length;
  return { matched, missing, matchedRatio: ratio };
}
