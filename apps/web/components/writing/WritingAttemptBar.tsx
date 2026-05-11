// ─────────────────────────────────────────────────────────────────────────────
// WritingAttemptBar.tsx — Quota progress bar for the writing task folder.
//
// Shows:
//   • "N of M attempts used" label  (or "Quota used — free retries active")
//   • Remaining count  (or "Retry mode ⚡" in bonus-retry mode)
//   • Filled progress bar (emerald → amber in bonus-retry mode)
//   • Plan name chip on the right
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";

interface WritingAttemptBarProps {
  used: number;
  attemptsLimit: number | null;
  isBonusRetry: boolean;
  plan: string;
}

export function WritingAttemptBar({
  used,
  attemptsLimit,
  isBonusRetry,
  plan,
}: WritingAttemptBarProps) {
  const fillPct = attemptsLimit
    ? Math.min((used / attemptsLimit) * 100, 100)
    : 100;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-surface px-4 py-3 flex items-center gap-4">
      {/* Progress section */}
      <div className="flex-1 space-y-1.5">
        {/* Labels row */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-subtle font-medium">
            {isBonusRetry
              ? "Quota used — free retries active"
              : `${used} of ${attemptsLimit ?? "∞"} attempts used`}
          </span>
          {isBonusRetry ? (
            <span className="text-amber-400 font-semibold">Retry mode ⚡</span>
          ) : (
            <span className="text-subtle">
              {attemptsLimit !== null
                ? `${Math.max(0, attemptsLimit - used)} remaining`
                : "Unlimited"}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isBonusRetry ? "bg-amber-500" : "bg-primary"
            )}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      {/* Plan chip */}
      <div className="text-right shrink-0">
        <p className="text-xs text-subtle">Plan</p>
        <p className="text-sm font-bold text-foreground capitalize">{plan}</p>
      </div>
    </div>
  );
}
