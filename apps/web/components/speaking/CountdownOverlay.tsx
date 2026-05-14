// ─────────────────────────────────────────────────────────────────────────────
// CountdownOverlay.tsx — Fullscreen 3 → 2 → 1 → GO! countdown
//
// Plays each step for COUNTDOWN_STEP_DURATION_MS (defined in constants).
// This component is purely visual — the useSpeakingAttempt hook owns the
// setTimeout that advances to PREP once the overlay finishes.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { COUNTDOWN_STEPS, COUNTDOWN_STEP_DURATION_MS } from "@/lib/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

type CountdownStep = (typeof COUNTDOWN_STEPS)[number];

// ── Props ─────────────────────────────────────────────────────────────────────

interface CountdownOverlayProps {
  className?: string;
}

/**
 * Fullscreen 3 → 2 → 1 → GO! overlay.
 *
 * Cycles through COUNTDOWN_STEPS, showing each for COUNTDOWN_STEP_DURATION_MS.
 * Each new step triggers the `countdown-in` keyframe (scale-from-large fade-in).
 */
export function CountdownOverlay({ className }: CountdownOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [animKey,   setAnimKey]   = useState(0); // bumped to retrigger CSS animation

  const currentStep: CountdownStep = COUNTDOWN_STEPS[stepIndex] ?? COUNTDOWN_STEPS[COUNTDOWN_STEPS.length - 1];
  const isGo = currentStep === "GO!";

  useEffect(() => {
    if (stepIndex >= COUNTDOWN_STEPS.length - 1) return; // stay on last step

    const timer = setTimeout(() => {
      setStepIndex((prev) => prev + 1);
      setAnimKey((prev) => prev + 1);
    }, COUNTDOWN_STEP_DURATION_MS);

    return () => clearTimeout(timer);
  }, [stepIndex]);

  return (
    <div
      className={cn(
        // Intentionally NOT fixed/inset-0 — the parent practice layout.tsx
        // (z-[55] fixed canvas) provides the full-screen context. Using h-full
        // here fills that canvas correctly and avoids a stacking-context conflict.
        // If CountdownOverlay is ever used outside a fixed-canvas parent,
        // this will need to revert to "fixed inset-0 z-50".
        "h-full w-full flex flex-col items-center justify-center gap-6",
        "bg-canvas",
        className
      )}
      aria-live="assertive"
      role="status"
      aria-label={isGo ? "GO!" : `Starting in ${currentStep}`}
    >
      {/* Step display with bounce-in animation */}
      <div
        key={animKey}
        className={cn(
          "text-[9rem] font-black leading-none select-none animate-countdown-in",
          isGo ? "text-amber-400" : "text-canvas-text"
        )}
      >
        {currentStep}
      </div>


      {/* Step pip indicators */}
      <div className="flex gap-2 mt-4" aria-hidden="true">
        {COUNTDOWN_STEPS.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i <= stepIndex
                ? "w-6 bg-primary"
                : "w-2 bg-canvas-subtle/40"
            )}
          />
        ))}
      </div>
    </div>
  );
}
