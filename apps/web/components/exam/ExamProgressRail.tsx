"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ExamProgressRail — Fixed top bar showing task 1–8 status during the exam.
//
// Displays:
//   • Task pills: pending (grey) | active (indigo pulse) | done (green check)
//     | error (red)
//   • Current task label
//   • Overall task counter ("Task 3 of 8")
// ─────────────────────────────────────────────────────────────────────────────

import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn }                        from "@/lib/utils";
import type { MockExamTask }         from "@/lib/types";

const TASK_SHORT_LABELS: Record<number, string> = {
  1: "Advice",
  2: "Experience",
  3: "Scene",
  4: "Predictions",
  5: "Compare",
  6: "Situation",
  7: "Opinion",
  8: "Unusual",
};

interface ExamProgressRailProps {
  tasks:            MockExamTask[];
  currentTaskIndex: number;
}

export function ExamProgressRail({ tasks, currentTaskIndex }: ExamProgressRailProps) {
  const activeTask = tasks[currentTaskIndex];

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-canvas/90 backdrop-blur-md border-b border-white/[0.07]">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-4">

        {/* Brand label */}
        <span className="text-xs font-bold text-amber-400 shrink-0 hidden sm:block">
          CELPIP Mock
        </span>

        {/* Task pills */}
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-none">
          {tasks.map((task, i) => {
            const isActive = i === currentTaskIndex;
            const isDone   = task.status === "done";
            const isError  = task.status === "error";

            return (
              <div
                key={task.taskNumber}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold shrink-0 transition-all duration-300",
                  isDone
                    ? "bg-emerald-900/40 border border-emerald-700/40 text-emerald-400"
                    : isError
                    ? "bg-red-900/40 border border-red-700/40 text-red-400"
                    : isActive
                    ? "bg-amber-600/30 border border-amber-500/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                    : "bg-white/[0.04] border border-white/[0.08] text-white/30"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : isError ? (
                  <AlertCircle className="w-3 h-3" />
                ) : (
                  <span
                    className={cn(
                      "w-3 h-3 rounded-full",
                      isActive
                        ? "bg-amber-400 animate-pulse"
                        : "bg-white/20"
                    )}
                  />
                )}
                <span>T{task.taskNumber}</span>
              </div>
            );
          })}
        </div>

        {/* Current task label */}
        {activeTask && (
          <div className="shrink-0 text-right hidden md:block">
            <p className="text-[10px] text-subtle">Current task</p>
            <p className="text-xs font-semibold text-foreground">
              {`Task ${activeTask.taskNumber} — ${TASK_SHORT_LABELS[activeTask.taskNumber] ?? ""}`}
            </p>
          </div>
        )}

        {/* Counter badge */}
        <div className="shrink-0 px-2 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-semibold text-subtle">
          {currentTaskIndex + 1} / {tasks.length}
        </div>
      </div>
    </div>
  );
}
