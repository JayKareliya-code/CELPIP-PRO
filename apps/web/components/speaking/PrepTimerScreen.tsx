"use client";

import { TimerCard } from "@/components/speaking/TimerCard";
import { TaskPromptBox } from "@/components/speaking/TaskPromptBox";
import { TaskIdentityStrip } from "@/components/speaking/TaskIdentityStrip";
import { cn } from "@/lib/utils";

interface PrepTimerScreenProps {
  secondsLeft: number;
  totalPrepSeconds: number;
  totalResponseSeconds: number;
  promptText: string;
  imageUrl?: string | null;
  taskNumber?: number;
  taskTitle?: string;
  /** When false the inline task strip is suppressed — used by MockExamShell */
  showInfoBar?: boolean;
  className?: string;
}

export function PrepTimerScreen({
  secondsLeft,
  totalPrepSeconds,
  totalResponseSeconds,
  promptText,
  imageUrl,
  taskNumber = 1,
  taskTitle = "Speaking Task",
  showInfoBar = true,
  className,
}: PrepTimerScreenProps) {
  const hasImage = Boolean(imageUrl);

  return (
    <div className={cn("flex flex-col flex-1", className)}>

      <div className="flex-1 flex items-center justify-center py-8">
      <div className={cn(
        "w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6",
        hasImage ? "flex-col lg:flex-row" : "flex-col",
      )}>

        {/* Scene image — Tasks 3, 4, 8 */}
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

          {/* ── Inline task identity strip ───────────────────────────────────
              Sits directly above the prompt card. Uses the shared TaskIdentityStrip
              component for visual consistency across all prep-phase screens.
              showInfoBar=false is injected by MockExamShell via withNoInfoBar(). */}
          {showInfoBar && (
            <TaskIdentityStrip
              taskNumber={taskNumber}
              taskTitle={taskTitle}
              prepSeconds={totalPrepSeconds}
              responseSeconds={totalResponseSeconds}
            />
          )}

          {/* Prompt — hero */}
          <TaskPromptBox promptText={promptText} variant="overlay" className="w-full" />

          {/* Timer — supporting */}
          <TimerCard secondsLeft={secondsLeft} totalSeconds={totalPrepSeconds} />

          {/* Guidance */}
          <p className="text-center text-xs text-canvas-subtle/50">
            {hasImage
              ? "Study the image and read the prompt. Recording starts when time is up."
              : "Read the prompt carefully. Recording will start automatically when time is up."}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
