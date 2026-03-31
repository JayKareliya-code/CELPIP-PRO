// ─────────────────────────────────────────────────────────────────────────────
// TimerDisplay.tsx — Shared MM:SS clock for speaking and writing sessions
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";

// ── Size map ──────────────────────────────────────────────────────────────────

const SIZE_CLASSES = {
  sm: "text-lg font-semibold tabular-nums",
  md: "text-3xl font-bold   tabular-nums",
  lg: "text-5xl font-bold   tabular-nums tracking-tight",
} as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface TimerDisplayProps {
  /** Remaining seconds to display. */
  secondsLeft: number;
  /**
   * Colour theme:
   *   "dark"  — white text, used on dark practice canvas (speaking)
   *   "light" — dark text, used on light writing editor
   */
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  /**
   * When true the time text pulses red when secondsLeft ≤ 10.
   * Only applies during recording phases.
   */
  pulseWhenCritical?: boolean;
}

/**
 * Shared MM:SS timer display.
 *
 * Used by:
 *   - PrepTimerScreen (dark, lg)
 *   - RecordingInterface (dark, md)
 *   - WritingPracticeSession header (light, sm)
 */
export function TimerDisplay({
  secondsLeft,
  variant = "dark",
  size = "md",
  pulseWhenCritical = false,
}: TimerDisplayProps) {
  const isCritical = pulseWhenCritical && secondsLeft <= 10;

  return (
    <span
      className={cn(
        SIZE_CLASSES[size],
        // Base colour
        variant === "dark" ? "text-canvas-text" : "text-foreground",
        // Critical state overrides colour and adds pulse animation
        isCritical && "text-danger animate-pulse"
      )}
      aria-live="polite"
      aria-atomic="true"
      aria-label={`${secondsLeft} seconds remaining`}
    >
      {formatTime(secondsLeft)}
    </span>
  );
}
