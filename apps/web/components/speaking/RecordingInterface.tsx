"use client";

// ─────────────────────────────────────────────────────────────────────────────
// RecordingInterface.tsx — RECORDING phase UI
//
// Layout variants:
//   text-only  (Tasks 1, 2, 6, 7)
//     → centred column: phase badge → mic icon → waveform → timer → bar
//
//   with-image (Tasks 3, 4, 8)
//     → narrow:  image top (compact) → recording controls below
//     → wide:    image left (sticky) | recording controls right
//
// Both variants use the same TimerBar as the primary recording-time indicator.
// ─────────────────────────────────────────────────────────────────────────────

import { Mic }         from "lucide-react";
import { MicWaveform } from "@/components/speaking/MicWaveform";
import { TimerDisplay } from "@/components/common/TimerDisplay";
import { TimerBar }    from "@/components/common/TimerBar";
import { cn }          from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface RecordingInterfaceProps {
  /** Current seconds remaining in the response phase. */
  secondsLeft: number;
  /** Total response duration — used to calculate fill %. */
  totalResponseSeconds: number;
  /** Optional label for multi-part tasks (e.g. "Part 2 of 2"). */
  partLabel?: string;
  /**
   * Context image URL — present for Tasks 3, 4, 8.
   * Keeps the scene visible while the candidate speaks.
   */
  imageUrl?: string | null;
  /** Prompt text — shown below the image for image-based tasks. */
  promptText?: string;
  className?: string;
}

// ── Shared sub-elements ───────────────────────────────────────────────────────

/** REC • [part label] badge row */
function RecIndicator({ partLabel }: { partLabel?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-danger" />
      </span>
      <span className="text-xs font-semibold tracking-[0.2em] uppercase text-danger">
        Recording
      </span>
      {partLabel && (
        <span className="ml-2 text-xs text-canvas-subtle border border-canvas-subtle/30 rounded-full px-2 py-0.5">
          {partLabel}
        </span>
      )}
    </div>
  );
}

/** Pulsing mic icon ring */
function MicRing({ size = "lg" }: { size?: "sm" | "lg" }) {
  const ring = size === "lg"
    ? "h-20 w-20"
    : "h-14 w-14";
  const icon = size === "lg"
    ? "w-9 h-9"
    : "w-6 h-6";
  return (
    <div className={cn(
      "flex items-center justify-center rounded-full bg-danger/10 border border-danger/30 animate-pulse-ring",
      ring,
    )}>
      <Mic className={cn("text-danger", icon)} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * Recording phase full-screen UI.
 *
 * The TimerBar (horizontal depleting slider) is the primary time indicator
 * for all recording tasks — consistent regardless of layout variant.
 */
export function RecordingInterface({
  secondsLeft,
  totalResponseSeconds,
  partLabel,
  imageUrl,
  promptText,
  className,
}: RecordingInterfaceProps) {
  const hasImage = Boolean(imageUrl);

  /** Core recording controls block — identical for both layout variants */
  const recordingControls = (
    <div className="flex flex-col items-center gap-5 w-full">
      <RecIndicator partLabel={partLabel} />
      <MicRing />
      <MicWaveform isActive className="h-12 w-full max-w-xs" />

      <TimerDisplay
        secondsLeft={secondsLeft}
        variant="dark"
        size="lg"
        pulseWhenCritical
      />

      {/* Depleting timer bar — primary recording time indicator */}
      <TimerBar
        secondsLeft={secondsLeft}
        totalSeconds={totalResponseSeconds}
        className="max-w-md"
      />
    </div>
  );

  // ── Image-based layout (Tasks 3, 4, 8) ──────────────────────────────────
  if (hasImage) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center min-h-screen bg-canvas px-4 py-4 gap-6",
          "lg:flex-row lg:items-center lg:justify-center lg:gap-10 lg:px-6 lg:py-10",
          className,
        )}
      >
        {/* ── Left: scene image + prompt reference ──────────────────────── */}
        <div className="w-full lg:w-[460px] lg:shrink-0 lg:sticky lg:top-14 space-y-3">
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl!}
              alt="Task scene"
              className="w-full object-cover max-h-[200px] lg:max-h-[300px]"
              draggable={false}
            />
          </div>
          {promptText && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-canvas-subtle/50 mb-1.5 select-none">
                Prompt
              </p>
              <p className="text-xs leading-relaxed text-canvas-subtle whitespace-pre-line">
                {promptText}
              </p>
            </div>
          )}
        </div>

        {/* ── Right: recording controls ─────────────────────────────────── */}
        <div className="w-full lg:w-80 flex flex-col items-center gap-6">
          {recordingControls}
        </div>
      </div>
    );
  }

  // ── Text-only layout (Tasks 1, 2, 6, 7) ─────────────────────────────────
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 sm:gap-8 min-h-screen bg-canvas px-4 sm:px-6 pt-4 pb-8",
        className,
      )}
    >
      {recordingControls}
    </div>
  );
}
