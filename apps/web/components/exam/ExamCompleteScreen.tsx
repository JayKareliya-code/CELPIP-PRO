"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ExamCompleteScreen — Post-exam summary shown when all 8 tasks are done.
//
// Displays:
//   • "Exam Complete" hero
//   • 8-row task results table: Task | Status | Estimated Band
//   • Scoring-in-progress banner (band shows "—" until backend scores it)
//   • CTAs: Go to Dashboard, Practice Individual Tasks
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import {
  CheckCircle2, AlertCircle, Clock, Mic,
  LayoutDashboard, ChevronRight,
} from "lucide-react";
import { cn }                from "@/lib/utils";
import { useExamResults }   from "@/lib/hooks/useExamResults";
import { USE_MOCK }         from "@/lib/api";
import type { MockExamTask } from "@/lib/types";

const TASK_LABELS: Record<number, string> = {
  1: "Giving Advice",
  2: "Personal Experience",
  3: "Describing a Scene",
  4: "Making Predictions",
  5: "Comparing & Persuading",
  6: "Difficult Situation",
  7: "Expressing Opinions",
  8: "Unusual Situation",
};

interface ExamCompleteScreenProps {
  tasks:     MockExamTask[];
  /** Stable UUID generated at exam-start — used to poll for band scores. */
  sessionId: string;
}

export function ExamCompleteScreen({ tasks, sessionId }: ExamCompleteScreenProps) {
  // Start polling for band scores immediately.
  // In mock/dev mode (USE_MOCK) the hook is skipped — bands stay "—".
  useExamResults(USE_MOCK ? "" : sessionId);

  const completedCount = tasks.filter((t) => t.status === "done").length;
  const errorCount     = tasks.filter((t) => t.status === "error").length;
  const allDone        = completedCount === tasks.length;

  return (
    <div className="min-h-screen bg-canvas flex flex-col">

      {/* Hero */}
      <div className="relative overflow-hidden px-6 py-14 text-center flex flex-col items-center gap-4">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 via-canvas to-canvas pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-emerald-600/10 blur-3xl rounded-full pointer-events-none" />

        {/* Trophy icon */}
        <div className="relative w-20 h-20 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-900/20">
          <span className="text-4xl select-none">🎉</span>
        </div>

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 text-xs font-semibold">
            Mock Exam Complete
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {allDone ? "Well done!" : "Exam Finished"}
          </h1>
          <p className="text-subtle text-sm max-w-sm mx-auto">
            {completedCount} of {tasks.length} tasks recorded.
            {errorCount > 0 && ` ${errorCount} task(s) had upload issues.`}
            {" "}AI scoring is in progress — check back shortly.
          </p>
        </div>
      </div>

      {/* Results table */}
      <div className="flex-1 px-4 pb-6 max-w-2xl mx-auto w-full space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
          Results
        </h2>

        <div className="rounded-2xl border border-white/[0.07] bg-surface overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[auto_1fr_auto] gap-3 px-4 py-2 border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-wide text-subtle/50">
            <span>Task</span>
            <span>Name</span>
            <span className="text-right">Est. Band</span>
          </div>

          {/* Task rows */}
          {tasks.map((task) => {
            const isDone  = task.status === "done";
            const isError = task.status === "error";

            return (
              <div
                key={task.taskNumber}
                className="grid grid-cols-[auto_1fr_auto] gap-3 items-center px-4 py-3 border-b border-white/[0.04] last:border-0"
              >
                {/* Status icon */}
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.04]">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isError ? (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-white/20" />
                  )}
                </div>

                {/* Label */}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Task {task.taskNumber}
                  </p>
                  <p className="text-xs text-subtle">{TASK_LABELS[task.taskNumber]}</p>
                </div>

                {/* Band */}
                <div className="text-right shrink-0">
                  {task.estimatedBand != null ? (
                    <span className="text-lg font-bold text-amber-400 tabular-nums">
                      {task.estimatedBand}
                    </span>
                  ) : isError ? (
                    <span className="text-xs text-red-400 font-medium">Error</span>
                  ) : (
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-sm font-semibold text-white/20">—</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scoring in progress banner */}
        <div className="rounded-xl border border-amber-700/25 bg-amber-950/20 px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-sm font-semibold text-amber-300">AI scoring in progress</p>
          </div>
          <p className="text-xs text-amber-300/60 ml-auto hidden sm:block">
            Results appear above when ready
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/dashboard"
            id="exam-complete-dashboard-btn"
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl",
              "bg-primary hover:bg-primary/90 active:scale-[0.98]",
              "text-primary-foreground font-semibold text-sm",
              "border border-amber-400/30",
              "shadow-lg shadow-amber-900/30 btn-glow",
              "transition-all duration-150"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link
            href="/speaking"
            id="exam-complete-practice-btn"
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl",
              "bg-white/[0.05] hover:bg-white/[0.08] active:scale-[0.98]",
              "text-foreground font-semibold text-sm",
              "border border-white/[0.09] hover:border-white/[0.15]",
              "transition-all duration-150"
            )}
          >
            <Mic className="w-4 h-4" />
            Practice Individual Tasks
            <ChevronRight className="w-4 h-4 ml-auto" />
          </Link>
        </div>
      </div>
    </div>
  );
}
