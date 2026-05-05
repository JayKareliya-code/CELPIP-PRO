// ─────────────────────────────────────────────────────────────────────────────
// MockExamInfoBar.tsx — Unified progress + task identity bar for the mock exam
//
// Two-section layout:
//
//   Section 1 — Progress rail (generous height, large readable dots):
//     ①  ②  ③  ④  ⑤  ⑥  ⑦  ⑧        Task 3 of 8   ● REC  1:20
//
//   Section 2 — Task identity (matches TaskIdentityStrip):
//     TASK 3                          [Prep 30s] [Rec 60s]
//     Describing a Scene
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { cn }         from "@/lib/utils";
import type { MockExamTask } from "@/lib/types";

interface MockExamInfoBarProps {
  tasks:            MockExamTask[];
  currentTaskIndex: number;
  taskTitle:        string;
  prepSeconds:      number;
  responseSeconds:  number;
  isRecording?:     boolean;
  secondsLeft?:     number;
  partLabel?:       string;
}

export function MockExamInfoBar({
  tasks,
  currentTaskIndex,
  taskTitle,
  prepSeconds,
  responseSeconds,
  isRecording = false,
  secondsLeft,
  partLabel,
}: MockExamInfoBarProps) {
  const activeTask = tasks[currentTaskIndex];
  const isCritical = isRecording && (secondsLeft ?? 0) <= 10;
  const taskNumber = activeTask?.taskNumber ?? 0;
  const taskLabel  = (taskNumber as number) === 0 ? "Practice" : `Task ${taskNumber}`;

  return (
    <div className="sticky top-0 z-10 shrink-0 w-full bg-canvas/95 backdrop-blur-md border-b border-border/40">

      {/* ── Section 1: Progress rail ────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 sm:px-10 pt-4 pb-3 flex items-center justify-between gap-6">

        {/* Task dots — large enough to read without squinting */}
        <div className="flex items-center gap-2">
          {tasks.map((task, i) => {
            const isActive = i === currentTaskIndex;
            const isDone   = task.status === "done";
            const isError  = task.status === "error";
            return (
              <div
                key={task.taskNumber}
                title={`Task ${task.taskNumber}`}
                className={cn(
                  // w-9 h-9 = 36px — large enough to be clearly readable
                  "flex items-center justify-center w-9 h-9 rounded-full border-2",
                  "text-xs font-bold transition-all duration-300 select-none",
                  isDone
                    ? "bg-success/15 border-success/50 text-success"
                    : isError
                    ? "bg-danger/15 border-danger/50 text-danger"
                    : isActive
                    ? "bg-primary/20 border-primary/70 text-primary scale-110 shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]"
                    : "bg-white/[0.04] border-border/30 text-canvas-subtle/50",
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isError ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  task.taskNumber
                )}
              </div>
            );
          })}
        </div>

        {/* Right side — counter + live REC */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Task counter */}
          <span className="px-3 py-1 rounded-full bg-white/[0.06] border border-border/40
                           text-xs text-canvas-subtle/80 font-semibold tabular-nums">
            Task {currentTaskIndex + 1} of {tasks.length}
          </span>

          {/* Live REC indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full
                            bg-danger/10 border border-danger/30">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
              </span>
              <span className="text-danger font-bold uppercase tracking-widest text-[11px]">Rec</span>
              {secondsLeft !== undefined && (
                <span className={cn(
                  "tabular-nums font-bold text-sm",
                  isCritical ? "text-danger animate-pulse" : "text-canvas-text",
                )}>
                  {formatTime(secondsLeft)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Thin divider between sections */}
      <div className="max-w-5xl mx-auto px-6 sm:px-10">
        <div className="border-t border-border/20" />
      </div>

      {/* ── Section 2: Task identity ─────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 sm:px-10 pt-3 pb-4 flex flex-col gap-0.5">
        {/* Amber micro-label — matches TaskIdentityStrip */}
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-primary/70 select-none">
          {taskLabel}{partLabel && ` · ${partLabel}`}
        </p>

        {/* Title + timing pills */}
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-canvas-text leading-tight">
            {taskTitle}
          </h2>

          {/* Timing pills — identical to TaskIdentityStrip */}
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

      {/* Recording progress bar — full-width depleting line */}
      {isRecording && secondsLeft !== undefined && (
        <div className="h-[2px] w-full bg-border/30">
          <div
            className={cn(
              "h-full transition-all duration-1000 ease-linear",
              isCritical ? "bg-danger" : "bg-danger/50",
            )}
            style={{ width: `${Math.min(100, (secondsLeft / responseSeconds) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
