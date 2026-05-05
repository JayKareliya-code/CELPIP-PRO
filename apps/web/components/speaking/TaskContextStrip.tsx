// ─────────────────────────────────────────────────────────────────────────────
// TaskContextStrip — Persistent top bar for all speaking exam phase screens.
//
// Layout:
//   [Task N]  Task Title          PREP TIME badge    [arc ring] 0:29
//
// The timer is shown as a SMALL arc ring (40px) to the LEFT of the MM:SS text,
// not overlaid inside it (too small). This is cleaner at the strip height.
//
// Recording mode: badge swaps to pulsing REC dot, ring turns red,
// and a thin depleting progress bar renders at the bottom of the strip.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { TimerRing }    from "@/components/common/TimerRing";
import { TimerBar }     from "@/components/common/TimerBar";
import { formatTime }   from "@/lib/utils";
import { cn }           from "@/lib/utils";

interface TaskContextStripProps {
  taskNumber:    number;
  taskTitle:     string;
  phaseLabel:    string;
  secondsLeft:   number;
  totalSeconds:  number;
  isRecording?:  boolean;
  partLabel?:    string;
  className?:    string;
}

export function TaskContextStrip({
  taskNumber,
  taskTitle,
  phaseLabel,
  secondsLeft,
  totalSeconds,
  isRecording = false,
  partLabel,
  className,
}: TaskContextStripProps) {
  const taskLabel  = taskNumber === 0 ? "Practice" : `Task ${taskNumber}`;
  const isCritical = secondsLeft <= 10;

  return (
    <div
      className={cn(
        "sticky top-0 z-10 shrink-0 w-full",
        "bg-canvas/95 backdrop-blur-md border-b border-border/40",
        className,
      )}
    >
      <div className="max-w-5xl mx-auto px-6 sm:px-10">

        {/* ── Main row ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between h-16 gap-4">

          {/* ── Left: Task identity ────────────────────────────────────── */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Task number pill */}
            <span className="shrink-0 inline-flex items-center rounded-lg border border-white/[0.10] bg-white/[0.05] px-2.5 py-1 text-[11px] font-bold tracking-wide text-white/50 select-none uppercase">
              {taskLabel}
            </span>
            {/* Task title */}
            <span className="text-sm font-semibold text-white/90 truncate">
              {taskTitle}
            </span>
            {/* Part label */}
            {partLabel && (
              <span className="hidden sm:inline text-[10px] text-white/40 border border-white/[0.12] rounded-full px-2 py-0.5 select-none shrink-0">
                {partLabel}
              </span>
            )}
          </div>

          {/* ── Right: Phase badge + timer ────────────────────────────── */}
          <div className="flex items-center gap-4 shrink-0">

            {/* Phase badge */}
            {isRecording ? (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-70" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-red-400 select-none">
                  Recording
                </span>
              </div>
            ) : (
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-primary px-3 py-1 rounded-full border border-primary/30 bg-primary/[0.08] select-none">
                {phaseLabel}
              </span>
            )}

            {/* Timer: ring + MM:SS side by side */}
            <div className="flex items-center gap-2">
              <TimerRing
                secondsLeft={secondsLeft}
                totalSeconds={totalSeconds}
                sizePx={32}
              />
              <span
                className={cn(
                  "tabular-nums font-bold text-base leading-none",
                  isCritical && isRecording
                    ? "text-red-400 animate-pulse"
                    : "text-white/90"
                )}
                aria-live="polite"
                aria-label={`${secondsLeft} seconds remaining`}
              >
                {formatTime(secondsLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Recording timer bar ─────────────────────────────────────── */}
        {isRecording && (
          <div className="-mt-2 pb-3">
            <TimerBar
              secondsLeft={secondsLeft}
              totalSeconds={totalSeconds}
              trackHeight="h-[3px]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
