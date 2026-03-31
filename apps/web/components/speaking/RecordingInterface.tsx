"use client";

// ─────────────────────────────────────────────────────────────────────────────
// RecordingInterface.tsx — RECORDING phase UI
//
// Shows:
//   • Pulsing REC indicator + part label (Task 5)
//   • MicWaveform — real-time microphone-driven bar visualiser
//   • Large TimerDisplay (remaining response time, pulses red at ≤10 s)
//   • Single depleting timer bar (plain div — avoids base-ui double-render bug)
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
  className,
}: RecordingInterfaceProps) {
  const pct     = totalResponseSeconds > 0 ? secondsLeft / totalResponseSeconds : 0;
  const fillPct = Math.round(Math.min(1, Math.max(0, pct)) * 100);
  const isLow   = secondsLeft <= RESPONSE_PULSE_THRESHOLD_SECS;

  // Colour of the single timer bar
  const barColour =
    isLow      ? "bg-danger"  :
    fillPct > 50 ? "bg-success" : "bg-warning";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-8 min-h-screen bg-canvas px-6",
        className
      )}
    >
      {/* ── REC indicator ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Pulsing dot */}
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

      {/* ── Mic icon ring ─────────────────────────────────────────────────── */}
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-danger/10 border border-danger/30 animate-pulse-ring">
        <Mic className="w-10 h-10 text-danger" />
      </div>

      {/* ── Live microphone waveform ─────────────────────────────────────── */}
      <MicWaveform isActive className="h-14 w-full max-w-xs" />

      {/* ── Timer ────────────────────────────────────────────────────────── */}
      <TimerDisplay
        secondsLeft={secondsLeft}
        variant="dark"
        size="lg"
        pulseWhenCritical
      />

      {/* ── Single depleting timer bar (plain div — no Progress wrapper) ── */}
      <div className="w-full max-w-md space-y-2">
        {/* Track */}
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          {/* Fill — width transitions over 1 s matching the tick interval */}
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
}
