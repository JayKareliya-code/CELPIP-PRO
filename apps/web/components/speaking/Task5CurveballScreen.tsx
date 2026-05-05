// ─────────────────────────────────────────────────────────────────────────────
// Task5CurveballScreen.tsx — Task 5 curveball prep + recording phases
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { Mic }                from "lucide-react";
import { MicWaveform }        from "@/components/speaking/MicWaveform";
import { TaskIdentityStrip }  from "@/components/speaking/TaskIdentityStrip";
import { TimerCard }          from "@/components/speaking/TimerCard";
import { TaskPromptBox }      from "@/components/speaking/TaskPromptBox";
import { cn }                 from "@/lib/utils";
import type { ChoiceOption }  from "@/lib/types";

interface Task5CurveballScreenProps {
  secondsLeft:              number;
  totalSeconds:             number;
  totalPrepSeconds?:        number;
  curveballOption:          ChoiceOption;
  selectedChoice:           ChoiceOption | null;
  curveballInstructionText: string;
  isRecording:              boolean;
  taskNumber?:              number;
  taskTitle?:               string;
  showInfoBar?:             boolean;
}

// ── Option detail card — neutral, no color fill ───────────────────────────────

function OptionDetailCard({
  option,
  label,
  isSelected = false,
}: {
  option:      ChoiceOption;
  label:       string;
  isSelected?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-canvas-subtle/50 select-none">
        {label}
      </p>
      <div className={cn(
        "rounded-2xl border overflow-hidden",
        isSelected ? "border-primary/40" : "border-border/40",
        "bg-white/[0.03]",
      )}>
        {option.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={option.image_url} alt={option.name}
            className="w-full max-h-[18vh] object-contain" />
        )}
        <div className="px-4 py-3">
          <h4 className={cn(
            "text-sm font-bold mb-1.5",
            isSelected ? "text-primary" : "text-canvas-text",
          )}>
            {option.name}
          </h4>
          <ul className="space-y-1">
            {option.details.map((d, i) => (
              <li key={i} className="text-xs leading-snug flex gap-1">
                <span className="text-canvas-text/90 font-semibold shrink-0">{d.label}:</span>
                <span className="text-canvas-text/75">{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function Task5CurveballScreen({
  secondsLeft,
  totalSeconds,
  totalPrepSeconds = 30,
  curveballOption,
  selectedChoice,
  curveballInstructionText,
  isRecording,
  taskNumber = 5,
  taskTitle  = "Comparing and Persuading",
  showInfoBar = true,
}: Task5CurveballScreenProps) {

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 sm:px-6 lg:px-8 py-8 w-full max-w-5xl mx-auto">

        {/* Task identity strip — inline, above curveball card */}
        {showInfoBar && (
          <TaskIdentityStrip
            taskNumber={taskNumber}
            taskTitle={taskTitle}
            prepSeconds={totalPrepSeconds}
            responseSeconds={totalSeconds}
            className="w-full"
          />
        )}

        {/* Scenario update card */}
        {curveballInstructionText && (
          <TaskPromptBox
            promptText={curveballInstructionText}
            variant="overlay"
            label="Scenario update"
            className="w-full"
          />
        )}

        {/* Option cards */}
        <div className="w-full flex flex-col sm:flex-row gap-4">
          <OptionDetailCard option={curveballOption} label="New option" />
          {selectedChoice && (
            <OptionDetailCard option={selectedChoice} label="Your choice" isSelected />
          )}
        </div>

        {/* Timer (PREP) or Mic card (RECORDING) */}
        {isRecording ? (
          <div className="w-full rounded-2xl border border-border/50 bg-surface/40 px-5 py-5 flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-white/[0.04] animate-pulse-ring">
              <Mic className="w-5 h-5 text-danger/80" />
            </div>
            <MicWaveform isActive className="h-7 w-full max-w-xs" />
            <p className="text-xs text-canvas-subtle/60">Speak clearly into your microphone</p>
          </div>
        ) : (
          <TimerCard
            secondsLeft={secondsLeft}
            totalSeconds={totalSeconds}
            label="Preparation Time"
            className="w-full"
          />
        )}

        {!isRecording && (
          <p className="text-xs text-canvas-subtle/50 text-center">
            Study the new option and prepare to defend your choice.
          </p>
        )}
      </div>
    </div>
  );
}
