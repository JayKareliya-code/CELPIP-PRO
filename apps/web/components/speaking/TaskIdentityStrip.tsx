// ─────────────────────────────────────────────────────────────────────────────
// TaskIdentityStrip.tsx — Inline task heading + timing pills
//
// Shared by PrepTimerScreen, Task5SelectionScreen, Task5CurveballScreen.
// Replaces the old ExamInfoBar sticky top bar — context now lives directly
// above the prompt card where the candidate's eye already is.
//
// Layout:
//   TASK 5                           ← amber micro-label
//   Comparing and Persuading  [Prep 45s] [Rec 60s]
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";

interface TaskIdentityStripProps {
  taskNumber:      number;
  taskTitle:       string;
  prepSeconds:     number;
  responseSeconds: number;
  className?:      string;
}

export function TaskIdentityStrip({
  taskNumber,
  taskTitle,
  prepSeconds,
  responseSeconds,
  className,
}: TaskIdentityStripProps) {
  const taskLabel = taskNumber === 0 ? "Practice" : `Task ${taskNumber}`;

  return (
    <div className={cn("flex flex-col gap-1 px-1 mb-1", className)}>
      {/* Amber micro-label — matches TaskPromptBox "YOUR PROMPT" label style */}
      <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-primary/70 select-none">
        {taskLabel}
      </p>

      {/* Title row + timing pills */}
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-canvas-text leading-tight">
          {taskTitle}
        </h2>

        {/* Timing pills */}
        <div className="flex items-center gap-2 shrink-0 mb-0.5">
          <span className="inline-flex items-center gap-1.5 rounded-lg
                           bg-white/[0.06] border border-white/[0.08]
                           px-3 py-1 text-xs font-semibold tabular-nums text-canvas-text/70">
            <span className="text-primary/70 font-bold">Prep</span>
            {prepSeconds}s
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg
                           bg-white/[0.06] border border-white/[0.08]
                           px-3 py-1 text-xs font-semibold tabular-nums text-canvas-text/70">
            <span className="text-primary/70 font-bold">Rec</span>
            {responseSeconds}s
          </span>
        </div>
      </div>
    </div>
  );
}
