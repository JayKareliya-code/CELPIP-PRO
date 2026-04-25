// ─────────────────────────────────────────────────────────────────────────────
// Task5CurveballScreen.tsx — RECORDING and RECORDING_PART2 phases for Task 5
//
// Handles BOTH curveball phases via `isRecording`:
//   isRecording=false (RECORDING)      → silent curveball-prep, ring timer
//   isRecording=true  (RECORDING_PART2) → mic active, depleting bar, waveform
//
// Everything fits in one viewport — no scrolling.
// Layout (flex-col h-screen):
//   1. Compact header: phase indicator + timer
//   2. Instruction banner (amber)
//   3. Option cards side-by-side, images capped at 20 vh
//   4. Bottom: guidance text OR mic/waveform controls
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { Mic }           from "lucide-react";
import { TimerRing }    from "@/components/common/TimerRing";
import { TimerDisplay } from "@/components/common/TimerDisplay";
import { TimerBar }     from "@/components/common/TimerBar";
import { MicWaveform }  from "@/components/speaking/MicWaveform";
import { cn }           from "@/lib/utils";
import { RESPONSE_PULSE_THRESHOLD_SECS } from "@/lib/constants";
import type { ChoiceOption }      from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Task5CurveballScreenProps {
  secondsLeft:              number;
  totalSeconds:             number;
  curveballOption:          ChoiceOption;
  selectedChoice:           ChoiceOption | null;
  curveballInstructionText: string;
  isRecording:              boolean;
}

// ── Option Detail Card ────────────────────────────────────────────────────────

function OptionDetailCard({
  option,
  variant = "default",
}: {
  option:   ChoiceOption;
  variant?: "curveball" | "selected" | "default";
}) {
  const headerColour =
    variant === "selected" ? "text-amber-300" : "text-foreground";

  const borderColour =
    variant === "selected" ? "border-amber-500/30 bg-amber-500/5" :
    "border-white/[0.08] bg-white/[0.03]";

  return (
    <div className={cn("rounded-xl border overflow-hidden flex flex-col", borderColour)}>
      {/* Image — capped at 20 vh, full image visible (object-contain, no crop) */}
      {option.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={option.image_url}
          alt={option.name}
          className="w-full max-h-[20vh] object-contain shrink-0"
        />
      )}
      <div className="px-4 py-3">
        <h4 className={cn("text-sm font-bold mb-1.5 underline underline-offset-2", headerColour)}>
          {option.name}
        </h4>
        <ul className="space-y-0.5">
          {option.details.map((d, i) => (
            <li key={i} className="text-xs text-canvas-subtle leading-snug">
              <span className="font-medium text-foreground/60">{d.label}:</span>{" "}
              <span>{d.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Task5CurveballScreen({
  secondsLeft,
  totalSeconds,
  curveballOption,
  selectedChoice,
  curveballInstructionText,
  isRecording,
}: Task5CurveballScreenProps) {
  const isLow = secondsLeft <= RESPONSE_PULSE_THRESHOLD_SECS;

  return (
    // h-screen + overflow-hidden → no scrolling
    <div className="flex flex-col h-screen overflow-hidden bg-canvas px-4 pt-2 pb-3 gap-3 items-center">

      {/* ── 1. Compact header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 w-full max-w-3xl shrink-0">
        {isRecording ? (
          // Recording phase: phase badge + timer display on one row, then TimerBar below
          <div className="w-full space-y-2">
            {/* REC badge row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-danger" />
                </span>
                <span className="text-xs font-semibold tracking-[0.18em] uppercase text-danger">Recording</span>
                <span className="text-xs text-canvas-subtle border border-canvas-subtle/30 rounded-full px-2 py-0.5">Part 2 of 2</span>
              </div>
              <TimerDisplay secondsLeft={secondsLeft} variant="dark" size="sm" pulseWhenCritical />
            </div>
            {/* Shared TimerBar — consistent with RecordingInterface */}
            <TimerBar
              secondsLeft={secondsLeft}
              totalSeconds={totalSeconds}
              hint={isLow ? "⚡ Finish your thought!" : "Speak clearly and naturally"}
            />
          </div>
        ) : (
          // Prep phase: compact ring (72 px) + badge
          <>
            <div className="relative flex items-center justify-center shrink-0">
              <TimerRing secondsLeft={secondsLeft} totalSeconds={totalSeconds} sizePx={72} />
              <div className="absolute inset-0 flex items-center justify-center">
                <TimerDisplay secondsLeft={secondsLeft} variant="dark" size="sm" />
              </div>
            </div>
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-primary px-3 py-1 rounded-full border border-primary/30 bg-primary/10 select-none">
              Preparation Time
            </span>
          </>
        )}
      </div>

      {/* ── 2. Instruction banner — neutral style matching Step 1 scenario box ── */}
      {curveballInstructionText && (
        <div className="w-full max-w-3xl shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-canvas-subtle/50 mb-1 select-none">Scenario update</p>
          <p className="text-base leading-snug text-canvas-text">{curveballInstructionText}</p>
        </div>
      )}

      {/* ── 3. Option cards — side-by-side, fill remaining space ────────────── */}
      <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-h-0 items-start">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-canvas-subtle/50 select-none">
            New option
          </p>
          <OptionDetailCard option={curveballOption} variant="curveball" />
        </div>

        {selectedChoice && (
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-canvas-subtle/50 select-none">
              Your choice
            </p>
            <OptionDetailCard option={selectedChoice} variant="selected" />
          </div>
        )}
      </div>

      {/* ── 4. Bottom controls ───────────────────────────────────────────────── */}
      {isRecording ? (
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 border border-danger/30 animate-pulse-ring">
            <Mic className="w-6 h-6 text-danger" />
          </div>
          <MicWaveform isActive className="h-8 w-full max-w-xs" />
        </div>
      ) : (
        <p className="text-xs text-canvas-subtle/60 text-center shrink-0 max-w-md">
          Study the new option and prepare to defend your choice. Recording starts automatically when time is up.
        </p>
      )}
    </div>
  );
}
