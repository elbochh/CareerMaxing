export function XPBar({ earned, total }: { earned: number; total: number }) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((earned / total) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Weekly XP</span>
        <span>
          {earned} / {total || 0}
        </span>
      </div>
      <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-fuchsia-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
