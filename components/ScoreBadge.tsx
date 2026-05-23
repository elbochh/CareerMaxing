import { cn } from "@/lib/utils";
import type { ScoreBand } from "@/types";

const COLORS: Record<ScoreBand, string> = {
  strong: "bg-success/15 border-success/40 text-success",
  good: "bg-accent/15 border-accent/40 text-accent-glow",
  maybe: "bg-warning/15 border-warning/40 text-warning",
  ignore: "bg-danger/10 border-danger/30 text-danger",
};

const LABEL: Record<ScoreBand, string> = {
  strong: "Strong fit",
  good: "Good fit",
  maybe: "Maybe",
  ignore: "Skip",
};

export function ScoreBadge({ score, band, kindLabel }: { score: number; band: ScoreBand; kindLabel?: string }) {
  return (
    <span className={cn("badge", COLORS[band])} title={`${kindLabel || "Score"}: ${score}/100`}>
      <span className="font-semibold">{score}</span>
      <span className="opacity-80">{LABEL[band]}</span>
    </span>
  );
}
