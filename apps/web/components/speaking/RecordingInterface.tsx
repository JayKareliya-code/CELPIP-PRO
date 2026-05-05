"use client";

// ─────────────────────────────────────────────────────────────────────────────
// RecordingInterface.tsx — RECORDING phase UI
//
// ExamInfoBar owns the live countdown (REC indicator + timer).
// Content: compact prompt reference + mic card (neutral, no color fill).
// ─────────────────────────────────────────────────────────────────────────────

import { Mic }           from "lucide-react";
import { MicWaveform }   from "@/components/speaking/MicWaveform";
import { ExamInfoBar }   from "@/components/speaking/ExamInfoBar";
import { TaskPromptBox } from "@/components/speaking/TaskPromptBox";
import { cn }            from "@/lib/utils";

interface RecordingInterfaceProps {
  secondsLeft:          number;
  totalResponseSeconds: number;
  totalPrepSeconds?:    number;
  partLabel?:           string;
  imageUrl?:            string | null;
  promptText?:          string;
  taskNumber?:          number;
  taskTitle?:           string;
  /** Suppress ExamInfoBar — used by MockExamShell */
  showInfoBar?:         boolean;
  className?:           string;
}

// ── Mic card — neutral surface, no color fill ─────────────────────────────────

function MicCard({ size = "lg" }: { size?: "sm" | "lg" }) {
  const ring = size === "lg" ? "h-16 w-16" : "h-12 w-12";
  const icon = size === "lg" ? "w-7 h-7"   : "w-5 h-5";

  return (
    <div className="rounded-2xl border border-border/50 bg-surface/40 px-5 py-6 flex flex-col items-center gap-4">
      {/* Mic ring */}
      <div className={cn(
        "flex items-center justify-center rounded-full border border-border/60 bg-white/[0.04] animate-pulse-ring",
        ring,
      )}>
        <Mic className={cn("text-danger/80", icon)} />
      </div>

      {/* Waveform */}
      <MicWaveform isActive className="h-7 w-full max-w-xs" />

      <p className="text-xs text-canvas-subtle/60 tracking-wide">
        Speak clearly into your microphone
      </p>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function RecordingInterface({
  secondsLeft,
  totalResponseSeconds,
  totalPrepSeconds = 30,
  partLabel,
  imageUrl,
  promptText,
  taskNumber = 1,
  taskTitle  = "Speaking Task",
  showInfoBar = true,
  className,
}: RecordingInterfaceProps) {
  const hasImage = Boolean(imageUrl);

  return (
    <div className={cn("flex flex-col flex-1", className)}>
      {showInfoBar && (
        <ExamInfoBar
          taskNumber={taskNumber}
          taskTitle={taskTitle}
          prepSeconds={totalPrepSeconds}
          responseSeconds={totalResponseSeconds}
          isRecording
          secondsLeft={secondsLeft}
          partLabel={partLabel}
        />
      )}

      <div className="flex-1 flex items-center justify-center py-8">
      <div className={cn(
        "w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6",
        hasImage ? "flex-col lg:flex-row" : "flex-col",
      )}>
        {/* Scene image */}
        {hasImage && (
          <div className="w-full lg:w-[52%] shrink-0 max-h-[360px]">
            {/* overflow-hidden clips the rounded corners; object-contain prevents stretching */}
            <div className="rounded-2xl border border-border/40 overflow-hidden max-h-[360px] flex items-center justify-center bg-white/[0.02]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl!} alt="Task scene"
                className="w-full h-auto max-h-[360px] object-contain rounded-2xl"
                draggable={false} />
            </div>
          </div>
        )}

        {/* Cards column */}
        <div className={cn(
          "flex flex-col gap-3 w-full",
          hasImage ? "lg:flex-1" : "max-w-2xl",
        )}>
          {promptText && (
            <TaskPromptBox promptText={promptText} variant="compact" label="Your prompt" className="w-full" />
          )}
          <MicCard size={hasImage ? "sm" : "lg"} />
        </div>
      </div>
      </div>
    </div>
  );
}
