// ─────────────────────────────────────────────────────────────────────────────
// WaveformAnimation.tsx — Animated audio bars shown during RECORDING phase
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WaveformAnimationProps {
  /**
   * When false the bars are rendered at minimum height (paused state).
   * Use this to freeze the animation visually when the session auto-advances.
   */
  isActive?: boolean;
  /** Number of bars in the waveform (default 12). */
  barCount?: number;
  className?: string;
}

// ── Per-bar configurations ────────────────────────────────────────────────────

// Each bar has its own animation duration & delay for an organic, non-uniform look.
const BAR_CONFIGS = [
  { duration: "0.7s",  delay: "0ms"   },
  { duration: "0.9s",  delay: "80ms"  },
  { duration: "0.65s", delay: "160ms" },
  { duration: "1.1s",  delay: "40ms"  },
  { duration: "0.8s",  delay: "240ms" },
  { duration: "0.75s", delay: "120ms" },
  { duration: "1.0s",  delay: "300ms" },
  { duration: "0.85s", delay: "60ms"  },
  { duration: "0.7s",  delay: "180ms" },
  { duration: "0.95s", delay: "220ms" },
  { duration: "0.6s",  delay: "140ms" },
  { duration: "1.15s", delay: "20ms"  },
] as const;

/**
 * Animated waveform bars during a recording session.
 *
 * Uses the `waveform-bar` keyframe defined in `tailwind.config.ts`.
 * CSS animation-delay utilities (.animation-delay-*) are defined in globals.css.
 */
export function WaveformAnimation({
  isActive = true,
  barCount  = 12,
  className,
}: WaveformAnimationProps) {
  const bars = BAR_CONFIGS.slice(0, barCount);

  return (
    <div
      className={cn("flex items-center justify-center gap-1", className)}
      aria-hidden="true"
    >
      {bars.map((cfg, i) => (
        <span
          key={i}
          className={cn(
            "inline-block w-1 rounded-full bg-primary",
            "origin-bottom",
            isActive ? "animate-waveform-bar" : "scale-y-[0.3] opacity-40"
          )}
          style={{
            height:              "2.5rem",
            animationDuration:   isActive ? cfg.duration : undefined,
            animationDelay:      isActive ? cfg.delay    : undefined,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationDirection:  i % 2 === 0 ? "alternate" : "alternate-reverse",
          }}
        />
      ))}
    </div>
  );
}
