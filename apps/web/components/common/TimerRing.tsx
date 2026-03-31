// ─────────────────────────────────────────────────────────────────────────────
// TimerRing.tsx — SVG circular countdown ring for PREP phase
//
// Design:
//   The ring DEPLETES clockwise as time runs down (no rotation animation).
//   A static transform="rotate(-90)" on the SVG group starts the ring at
//   12 o'clock instead of 3 o'clock — this is a one-time attribute, NOT a
//   CSS animation class, so it never spins.
//
//   The circumference is derived from the ACTUAL rendered radius (`trackR`)
//   so dasharray and dashoffset always match the circle's real size.
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface TimerRingProps {
  /** Current seconds remaining. */
  secondsLeft: number;
  /** Total duration for this phase — used to calculate the dash fraction. */
  totalSeconds: number;
  /** Diameter of the rendered SVG in px (default 160). */
  sizePx?: number;
  className?: string;
}

/**
 * Circular SVG countdown ring — purely presentational, no animation classes.
 *
 * The ring depletes (stroke-dashoffset increases) as secondsLeft decreases.
 * Colour transitions:
 *   > 50 % remaining → indigo  (primary)
 *   25–50 %          → amber   (warning)
 *   < 25 %           → red     (danger)
 */
export function TimerRing({
  secondsLeft,
  totalSeconds,
  sizePx   = 160,
  className,
}: TimerRingProps) {
  // ── Geometry ──────────────────────────────────────────────────────────────

  const center      = sizePx / 2;
  const strokeWidth = Math.round(sizePx * 0.065);          // ~6.5 % of diameter
  // Inner radius so the stroke stays inside the viewBox edge
  const trackR      = center - strokeWidth / 2 - 2;
  const circumference = 2 * Math.PI * trackR;

  // ── Progress ──────────────────────────────────────────────────────────────

  const pct        = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const clamped    = Math.min(1, Math.max(0, pct));
  // dashoffset 0 = full ring, circumference = empty ring
  const dashOffset = circumference * (1 - clamped);

  // ── Colour ────────────────────────────────────────────────────────────────

  const strokeColour =
    clamped > 0.5  ? "#6366F1" :   // indigo — plenty of time
    clamped > 0.25 ? "#FBBF24" :   // amber  — getting close
                     "#F87171";    // red    — urgent

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox={`0 0 ${sizePx} ${sizePx}`}
      className={cn("block", className)}
      aria-hidden="true"
    >
      {/*
       * rotate(-90) shifts the ring start point from 3 o'clock → 12 o'clock.
       * This is a permanent SVG attribute, NOT a CSS animation — it never spins.
       */}
      <g transform={`rotate(-90 ${center} ${center})`}>
        {/* Track ring — dimmed background */}
        <circle
          cx={center}
          cy={center}
          r={trackR}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />

        {/* Progress ring — depletes clockwise */}
        <circle
          cx={center}
          cy={center}
          r={trackR}
          fill="none"
          stroke={strokeColour}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 0.95s linear, stroke 0.5s ease",
          }}
        />
      </g>
    </svg>
  );
}
