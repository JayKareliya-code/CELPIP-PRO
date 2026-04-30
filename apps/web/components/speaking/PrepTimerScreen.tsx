// ─────────────────────────────────────────────────────────────────────────────
// PrepTimerScreen.tsx — Circular countdown during the PREP phase
//
// Layout variants:
//   text-only  (Tasks 1, 2, 6, 7)
//     → centred column: phase badge → timer ring → prompt card → guidance
//
//   with-image (Tasks 3, 4, 8)
//     → narrow:  image top → timer ring + prompt right column below
//     → wide:    image left (sticky) | phase badge + timer ring + prompt right
//
// The layout structure mirrors RecordingInterface so the transition between
// PREP and RECORDING feels seamless.
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
  /**
   * Context image URL — present for Tasks 3, 4, 8.
   * When provided the layout switches to the image-based variant.
   */
  imageUrl?: string | null;
  /** Extra classes for the root container. */
  className?: string;
}

// ── Shared sub-elements ───────────────────────────────────────────────────────

/** "Preparation Time" phase badge */
function PrepBadge() {
  return (
    <span className="text-xs font-semibold tracking-[0.2em] uppercase text-primary px-3 py-1 rounded-full border border-primary/30 bg-primary/10 select-none">
      Preparation Time
    </span>
  );
}

/**
 * Full-canvas prep phase screen.
 *
 * Renders one of two layout variants depending on whether an image is present:
 *   - Text-only  → classic centred timer + prompt card
 *   - With-image → image panel + side column (timer + prompt)
 *
 * The TimerRing (circular) is used for PREP — it conveys "reading/thinking"
 * time. The TimerBar (linear) is used for RECORDING — together they give
 * users a clear visual cue that the phase has changed.
 */
export function PrepTimerScreen({
  secondsLeft,
  totalPrepSeconds,
  promptText,
  imageUrl,
  className,
}: PrepTimerScreenProps) {
  const hasImage = Boolean(imageUrl);

  /** Circular timer ring with numeric display centred inside */
  const timerBlock = (
    <div className="relative flex items-center justify-center">
      <TimerRing
        secondsLeft={secondsLeft}
        totalSeconds={totalPrepSeconds}
        sizePx={180}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <TimerDisplay
          secondsLeft={secondsLeft}
          variant="dark"
          size="lg"
        />
      </div>
    </div>
  );

  /** Prompt card — shared style between both layout variants */
  const promptCard = (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-canvas-subtle/60 px-5 pt-4 pb-1 select-none">
        Your prompt
      </p>
      <p className="text-canvas-text text-sm leading-relaxed whitespace-pre-line px-5 pb-4">
        {promptText}
      </p>
    </div>
  );

  // ── Image-based layout (Tasks 3, 4, 8) ──────────────────────────────────
  if (hasImage) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center min-h-screen bg-canvas px-4 py-4 gap-5",
          "lg:flex-row lg:items-center lg:justify-center lg:gap-10 lg:px-6 lg:py-10",
          className,
        )}
      >
        {/* Phase label — top on mobile only */}
        <div className="lg:hidden"><PrepBadge /></div>

        {/* ── Left: scene image ─────────────────────────────────────────── */}
        <div className="w-full lg:w-[460px] lg:shrink-0 lg:sticky lg:top-14">
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl!}
              alt="Task scene"
              className="w-full object-cover max-h-[220px] lg:max-h-[340px]"
              draggable={false}
            />
          </div>
          {/* Guidance below image on wide screens */}
          <div className="hidden lg:block mt-3">
            <p className="text-canvas-subtle text-xs text-center">
              Study the image and read the prompt carefully. Recording starts when time is up.
            </p>
          </div>
        </div>

        {/* ── Right: phase badge + timer + prompt ───────────────────────── */}
        <div className="w-full lg:w-72 flex flex-col items-center gap-5">
          <div className="hidden lg:block"><PrepBadge /></div>
          {timerBlock}
          {promptCard}
          {/* Guidance below prompt on mobile */}
          <div className="lg:hidden">
            <p className="text-canvas-subtle text-xs text-center">
              Study the image and read the prompt carefully. Recording starts when time is up.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Text-only layout (Tasks 1, 2, 6, 7) ─────────────────────────────────
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 sm:gap-10 min-h-screen bg-canvas px-4 sm:px-6 pt-4 pb-8",
        className,
      )}
    >
      <PrepBadge />
      {timerBlock}

      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-8">
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-canvas-subtle/60 mb-3 select-none">
          Your prompt
        </p>
        <p className="text-canvas-text text-base sm:text-lg leading-relaxed whitespace-pre-line">
          {promptText}
        </p>
      </div>

      <p className="text-canvas-subtle text-sm text-center">
        Read the prompt carefully. Recording will start automatically when time is up.
      </p>
    </div>
  );
}
