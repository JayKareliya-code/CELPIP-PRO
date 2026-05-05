// ─────────────────────────────────────────────────────────────────────────────
// ExamInfoBar.tsx — Static exam top bar
//
// PREP:      [Task 1: Giving Advice]        Preparation: 30s | Recording: 60s
// RECORDING: [Task 1: Giving Advice]  ● REC  1:20  |  Recording: 60s
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { cn, formatTime } from "@/lib/utils";

interface ExamInfoBarProps {
  taskNumber:      number;
  taskTitle:       string;
  prepSeconds:     number;
  responseSeconds: number;
  isRecording?:    boolean;
  secondsLeft?:    number;
  partLabel?:      string;
  className?:      string;
}

export function ExamInfoBar({
  taskNumber,
  taskTitle,
  prepSeconds,
  responseSeconds,
  isRecording = false,
  secondsLeft,
  partLabel,
  className,
}: ExamInfoBarProps) {
  const taskLabel  = taskNumber === 0 ? "Practice" : `Task ${taskNumber}`;
  const isCritical = isRecording && (secondsLeft ?? 0) <= 10;

  return (
    <div
      className={cn(
        "sticky top-0 z-10 shrink-0 w-full",
        "bg-canvas/95 backdrop-blur-md border-b border-border/40",
        className,
      )}
    >
      {/* Main row */}
      <div className="max-w-5xl mx-auto px-6 sm:px-10 flex items-center justify-between h-14 gap-4">

        {/* Left — task identity */}
        <p className="text-sm font-semibold text-canvas-text/80 truncate">
          <span className="text-canvas-subtle mr-2">{taskLabel}:</span>
          {taskTitle}
          {partLabel && (
            <span className="ml-2 text-xs text-canvas-subtle/60 font-normal">{partLabel}</span>
          )}
        </p>

        {/* Right — phase durations */}
        <div className="flex items-center gap-3 shrink-0 text-xs text-canvas-subtle font-medium">
          {isRecording ? (
            <div className="flex items-center gap-2.5">
              {/* Pulsing REC dot */}
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
              </span>
              <span className="text-danger font-semibold uppercase tracking-widest text-[11px]">
                Rec
              </span>
              {secondsLeft !== undefined && (
                <span className={cn(
                  "tabular-nums font-bold text-sm",
                  isCritical ? "text-danger animate-pulse" : "text-canvas-text",
                )}>
                  {formatTime(secondsLeft)}
                </span>
              )}
              <span className="text-border">|</span>
            </div>
          ) : (
            <>
              <span>
                <span className="text-canvas-text/60 font-semibold">Prep:</span>{" "}
                {prepSeconds}s
              </span>
              <span className="text-border">|</span>
            </>
          )}
          <span>
            <span className="text-canvas-text/60 font-semibold">Recording:</span>{" "}
            {responseSeconds}s
          </span>
        </div>
      </div>

      {/* Depleting progress bar — recording only */}
      {isRecording && secondsLeft !== undefined && (
        <div className="h-[2px] w-full bg-border/30">
          <div
            className={cn("h-full transition-all duration-1000 ease-linear", isCritical ? "bg-danger" : "bg-danger/50")}
            style={{ width: `${Math.min(100, (secondsLeft / responseSeconds) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
