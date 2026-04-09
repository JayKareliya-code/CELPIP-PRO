// ─────────────────────────────────────────────────────────────────────────────
// PracticeQuotaBar — Reusable horizontal quota progress bar strip.
// Shows "N of M used" label, plan name, animated fill bar, and remaining count.
// ─────────────────────────────────────────────────────────────────────────────

interface PracticeQuotaBarProps {
  used:      number;
  limit:     number;
  color:     string;   // hex fill colour
  planLabel: string;
}

export function PracticeQuotaBar({ used, limit, color, planLabel }: PracticeQuotaBarProps) {
  const remaining = Math.max(0, limit - used);
  const pct       = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-surface px-4 py-3 flex items-center gap-4">
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-subtle">{used} of {limit} tests used</span>
          <span className="text-subtle capitalize">{planLabel}</span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-lg font-bold text-foreground">{remaining}</p>
        <p className="text-xs text-subtle">remaining</p>
      </div>
    </div>
  );
}
