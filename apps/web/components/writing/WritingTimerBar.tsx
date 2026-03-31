// ─────────────────────────────────────────────────────────────────────────────
// WritingTimerBar.tsx — Thin progress bar at the top of the writing session
//
// Colour transitions:
//   Normal (> 5 min left)  →  bg-success  (green)
//   Warning (1–5 min left) →  bg-warning  (amber)
//   Critical (<= 1 min)    →  bg-danger   (red) + animate-pulse
//
// The bar depletes left-to-right as time passes.
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";
import {
  TIMER_WARNING_THRESHOLD_SECS,
  TIMER_DANGER_THRESHOLD_SECS,
} from "@/lib/constants";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingTimerBarProps {
  /** Remaining seconds — drives the bar fill and colour. */
  secondsLeft:  number;
  /** Total duration for this task (used to compute fill %). */
  totalSeconds: number;
  className?:   string;
}

// ── Colour resolver ───────────────────────────────────────────────────────────

function barColour(secondsLeft: number): string {
  if (secondsLeft <= TIMER_DANGER_THRESHOLD_SECS)  return "bg-danger  animate-pulse";
  if (secondsLeft <= TIMER_WARNING_THRESHOLD_SECS) return "bg-warning";
  return "bg-success";
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Thin fixed bar across the top of the writing session screen.
 * Depletes from full (100%) to empty (0%) as timeLeft ticks down.
 * Colour shifts green → amber → red to communicate time pressure.
 */
export function WritingTimerBar({
  secondsLeft,
  totalSeconds,
  className,
}: WritingTimerBarProps) {
  const fillPct = totalSeconds > 0
    ? Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100))
    : 0;

  const isCritical = secondsLeft <= TIMER_DANGER_THRESHOLD_SECS;

  return (
    <div
      role="progressbar"
      aria-label="Time remaining"
      aria-valuenow={secondsLeft}
      aria-valuemin={0}
      aria-valuemax={totalSeconds}
      className={cn("w-full h-1.5 bg-border overflow-hidden", className)}
    >
      {/* Filled portion */}
      <div
        className={cn(
          "h-full transition-all duration-1000 ease-linear",
          barColour(secondsLeft),
          isCritical && "animate-pulse"
        )}
        style={{ width: `${fillPct}%` }}
      />
    </div>
  );
}
