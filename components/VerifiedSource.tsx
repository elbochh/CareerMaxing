import { ShieldCheck } from "lucide-react";
import type { OpportunityDoc } from "@/types";

function formatVerifiedDate(iso?: string): string {
  if (!iso) return "Verified source";
  const verified = new Date(iso);
  if (Number.isNaN(verified.getTime())) return "Verified source";

  const today = new Date();
  const sameDay = verified.toDateString() === today.toDateString();
  if (sameDay) return "Verified today";
  return `Verified on ${verified.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function VerifiedSource({ opp }: { opp: OpportunityDoc }) {
  if (!opp.isVerified) return null;
  return (
    <span
      className="badge-success inline-flex items-center gap-1"
      title={`Verified source: ${opp.sourceName} (${Math.round(opp.confidenceScore * 100)}% confidence)`}
    >
      <ShieldCheck className="w-3 h-3" />
      <span>Verified source</span>
      <span className="text-[10px] opacity-80">{formatVerifiedDate(opp.verifiedAt)}</span>
    </span>
  );
}
