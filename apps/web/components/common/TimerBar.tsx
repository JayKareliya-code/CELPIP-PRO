// ─────────────────────────────────────────────────────────────────────────────
// TimerBar.tsx — Horizontal depleting progress bar for timed phases
//
// Used as the primary timer indicator during RECORDING phases across all tasks.
// Color stages:
//   > 50 % remaining → success (green)
//   10–50 %          → warning (amber)
//   ≤ 10 %           → danger  (red) + optional pulse hint
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";
import { RESPONSE_PULSE_THRESHOLD_SECS } from "@/lib/constants";

// ── Props ─────────────────────────────────────────────────────────────────────

interface TimerBarProps {
  /** Seconds remaining in the current phase. */
  secondsLeft: number;
  /** Total seconds for the phase — used to calculate fill %. */
  totalSeconds: number;
  /**
   * Hint text displayed below the bar.
   * Defaults to a contextual message based on time remaining.
   */
  hint?: string;
  /** Height of the bar track. Defaults to "h-2". */
  trackHeight?: string;
  className?: string;
}

/**
 * Horizontal depleting timer bar — the primary recording-time indicator.
 *
 * This is a plain CSS div (not a shadcn Progress) to avoid the base-ui
 * double-track rendering bug.
 */
export function TimerBar({
  secondsLeft,
  totalSeconds,
  hint,
  trackHeight = "h-2",
  className,
}: TimerBarProps) {
  const pct     = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const fillPct = Math.round(Math.min(1, Math.max(0, pct)) * 100);
  const isLow   = secondsLeft <= RESPONSE_PULSE_THRESHOLD_SECS;

  const barColour =
    isLow        ? "bg-danger"  :
    fillPct > 50 ? "bg-success" : "bg-warning";

  const defaultHint = isLow
    ? "⚡ Finish your thought!"
    : "Speak clearly and at a natural pace";

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {/* Track + fill */}
      <div className={cn("w-full rounded-full bg-white/10 overflow-hidden", trackHeight)}>
        <div
          className={cn("h-full rounded-full transition-all duration-1000", barColour)}
          style={{ width: `${fillPct}%` }}
          role="progressbar"
          aria-valuenow={fillPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Recording time remaining"
        />
      </div>

      {/* Hint text */}
      <p className="text-xs text-canvas-subtle text-center select-none">
        {hint ?? defaultHint}
      </p>
    </div>
  );
}
