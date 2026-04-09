// ─────────────────────────────────────────────────────────────────────────────
// PrepTimerScreen.tsx — Circular countdown during the PREP phase
//
// Layout variants:
//   text-only  (Tasks 1, 2, 6, 7)
//     → timer ring centred, prompt box below
//
//   with-image (Tasks 3, 4, 8)
//     → image shown prominently in the centre, timer ring + prompt side panel
//     → on narrow screens: stacked (image → timer → prompt)
//     → on wide screens:   image left (medium size) | timer + prompt right
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

/**
 * Full-canvas prep phase screen.
 *
 * Renders one of two layout variants depending on whether an image is present:
 *   - Text-only  → classic centred timer + prompt card
 *   - With-image → image panel + side column (timer + prompt)
 */
export function PrepTimerScreen({
  secondsLeft,
  totalPrepSeconds,
  promptText,
  imageUrl,
  className,
}: PrepTimerScreenProps) {
  const hasImage = Boolean(imageUrl);

  // ── Shared sub-elements ──────────────────────────────────────────────────

  const phaseLabel = (
    <span className="text-xs font-semibold tracking-[0.2em] uppercase text-primary px-3 py-1 rounded-full border border-primary/30 bg-primary/10">
      Preparation Time
    </span>
  );

  const timerBlock = (
    <div className="relative flex items-center justify-center">
      <TimerRing
        secondsLeft={secondsLeft}
        totalSeconds={totalPrepSeconds}
        sizePx={140}
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

  const guidance = (
    <p className="text-canvas-subtle text-xs text-center">
      Study the image and read the prompt carefully. Recording starts when time is up.
    </p>
  );

  const guidanceTextOnly = (
    <p className="text-canvas-subtle text-sm text-center">
      Read the prompt carefully. Recording will start automatically when time is up.
    </p>
  );

  // ── Image-based layout (Tasks 3, 4, 8) ──────────────────────────────────
  if (hasImage) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center min-h-screen bg-canvas px-4 py-6 gap-5",
          "lg:flex-row lg:items-start lg:justify-center lg:gap-8 lg:py-10",
          className,
        )}
      >
        {/* Phase label — top on mobile, hidden on wide (shown in right col) */}
        <div className="lg:hidden">{phaseLabel}</div>

        {/* ── Left: scene image ─────────────────────────────────────────── */}
        <div className="w-full lg:w-[480px] lg:shrink-0 lg:sticky lg:top-8">
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl!}
              alt="Task scene"
              className="w-full object-cover max-h-[280px] lg:max-h-[340px]"
              draggable={false}
            />
          </div>
          {/* Guidance below image on wide screens */}
          <div className="hidden lg:block mt-3">{guidance}</div>
        </div>

        {/* ── Right: phase label + timer + prompt ───────────────────────── */}
        <div className="w-full lg:w-80 flex flex-col items-center gap-5">
          <div className="hidden lg:block">{phaseLabel}</div>
          {timerBlock}
          {promptCard}
          {/* Guidance below prompt on mobile */}
          <div className="lg:hidden">{guidance}</div>
        </div>
      </div>
    );
  }

  // ── Text-only layout (Tasks 1, 2, 6, 7) ─────────────────────────────────
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-8 min-h-screen bg-canvas px-6",
        className,
      )}
    >
      {phaseLabel}
      {timerBlock}

      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-canvas-subtle uppercase tracking-wider mb-3 font-medium">
          Your prompt
        </p>
        <p className="text-canvas-text text-base leading-relaxed whitespace-pre-line">
          {promptText}
        </p>
      </div>

      {guidanceTextOnly}
    </div>
  );
}
