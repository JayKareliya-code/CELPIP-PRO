"use client";

// ─────────────────────────────────────────────────────────────────────────────
// RecordingInterface.tsx — RECORDING phase UI
//
// Layout variants:
//   text-only  (Tasks 1, 2, 6, 7)
//     → classic centred layout: REC • waveform • timer • bar
//
//   with-image (Tasks 3, 4, 8)
//     → image panel persists so candidates can keep referring to it
//     → narrow:  image top (compact) → recording controls below
//     → wide:    image left (medium, sticky) | recording controls right
// ─────────────────────────────────────────────────────────────────────────────

import { Mic }          from "lucide-react";
import { MicWaveform }  from "@/components/speaking/MicWaveform";
import { TimerDisplay } from "@/components/common/TimerDisplay";
import { cn }           from "@/lib/utils";
import { RESPONSE_PULSE_THRESHOLD_SECS } from "@/lib/constants";

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

/**
 * Recording phase full-screen UI.
 *
 * Timer bar is a plain CSS div (width driven by `fillPct`), NOT a shadcn/ui
 * Progress, to avoid the base-ui double-track rendering bug.
 */
export function RecordingInterface({
  secondsLeft,
  totalResponseSeconds,
  partLabel,
  imageUrl,
  promptText,
  className,
}: RecordingInterfaceProps) {
  const pct     = totalResponseSeconds > 0 ? secondsLeft / totalResponseSeconds : 0;
  const fillPct = Math.round(Math.min(1, Math.max(0, pct)) * 100);
  const isLow   = secondsLeft <= RESPONSE_PULSE_THRESHOLD_SECS;
  const hasImage = Boolean(imageUrl);

  // Colour of the single timer bar
  const barColour =
    isLow        ? "bg-danger"  :
    fillPct > 50 ? "bg-success" : "bg-warning";

  // ── Shared: REC indicator ─────────────────────────────────────────────────
  const recIndicator = (
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

  // ── Shared: mic ring ──────────────────────────────────────────────────────
  const micRing = (
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-danger/10 border border-danger/30 animate-pulse-ring">
      <Mic className="w-9 h-9 text-danger" />
    </div>
  );

  // ── Shared: waveform + timer + bar ────────────────────────────────────────
  const controls = (
    <div className="flex flex-col items-center gap-5 w-full">
      <MicWaveform isActive className="h-12 w-full max-w-xs" />

      <TimerDisplay
        secondsLeft={secondsLeft}
        variant="dark"
        size="lg"
        pulseWhenCritical
      />

      {/* Single depleting timer bar — plain div, no Progress wrapper */}
      <div className="w-full max-w-md space-y-2">
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-1000", barColour)}
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <p className="text-xs text-canvas-subtle text-center">
          {isLow
            ? "⚡ Finish your thought!"
            : "Speak clearly and at a natural pace"}
        </p>
      </div>
    </div>
  );

  // ── Image-based layout (Tasks 3, 4, 8) ──────────────────────────────────
  if (hasImage) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-start min-h-screen bg-canvas px-4 py-6 gap-5",
          "lg:flex-row lg:items-start lg:justify-center lg:gap-8 lg:py-10",
          className,
        )}
      >
        {/* ── Left: scene image + prompt reference ──────────────────────── */}
        <div className="w-full lg:w-[440px] lg:shrink-0 lg:sticky lg:top-8 space-y-3">
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl!}
              alt="Task scene"
              className="w-full object-cover max-h-[240px] lg:max-h-[300px]"
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
        <div className="w-full lg:w-80 flex flex-col items-center gap-6 lg:pt-4">
          {recIndicator}
          {micRing}
          {controls}
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
      {recIndicator}
      {micRing}
      {controls}
    </div>
  );
}
