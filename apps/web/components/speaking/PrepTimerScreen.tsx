// ─────────────────────────────────────────────────────────────────────────────
// PrepTimerScreen.tsx — Circular countdown during the PREP phase
//
// Shows:
//   • The task prompt (so the user can read it during prep)
//   • A TimerRing (SVG circular countdown)
//   • TimerDisplay (MM:SS)
//   • "Read the prompt carefully" guidance
// ─────────────────────────────────────────────────────────────────────────────

import { TimerRing }    from "@/components/common/TimerRing";
import { TimerDisplay } from "@/components/common/TimerDisplay";
import { cn }           from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface PrepTimerScreenProps {
  /** Current seconds remaining in the prep phase. */
  secondsLeft: number;
  /** Total prep duration — used for the ring's dash calculation. */
  totalPrepSeconds: number;
  /** The prompt text for the task (displayed during prep). */
  promptText: string;
  /** Extra classes for the root container. */
  className?: string;
}

/**
 * Full-canvas prep phase screen.
 *
 * Delegates timer rendering completely to TimerRing + TimerDisplay.
 * This component only assembles the layout.
 */
export function PrepTimerScreen({
  secondsLeft,
  totalPrepSeconds,
  promptText,
  className,
}: PrepTimerScreenProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-8 min-h-screen bg-canvas px-6",
        className
      )}
    >
      {/* Phase label */}
      <span className="text-xs font-semibold tracking-[0.2em] uppercase text-primary px-3 py-1 rounded-full border border-primary/30 bg-primary/10">
        Preparation Time
      </span>

      {/* Circular timer */}
      <div className="relative flex items-center justify-center">
        <TimerRing
          secondsLeft={secondsLeft}
          totalSeconds={totalPrepSeconds}
          sizePx={160}
        />
        {/* MM:SS sits in the centre of the ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <TimerDisplay
            secondsLeft={secondsLeft}
            variant="dark"
            size="lg"
          />
        </div>
      </div>

      {/* Prompt box */}
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-canvas-subtle uppercase tracking-wider mb-3 font-medium">
          Your prompt
        </p>
        <p className="text-canvas-text text-base leading-relaxed whitespace-pre-line">
          {promptText}
        </p>
      </div>

      {/* Guidance */}
      <p className="text-canvas-subtle text-sm text-center">
        Read the prompt carefully. Recording will start automatically when time is up.
      </p>
    </div>
  );
}
