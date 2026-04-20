"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingExamIntroScreen — Intro shown before the writing mock starts.
//
// Displays both task prompts (truncated) + time allocations.
// User clicks "Begin Exam" to start.
// ─────────────────────────────────────────────────────────────────────────────

import { PenLine } from "lucide-react";
import type { WritingTask } from "@/lib/types";

interface WritingExamIntroScreenProps {
  task1:   WritingTask;
  task2:   WritingTask;
  onStart: () => void;
}

export function WritingExamIntroScreen({ task1, task2, onStart }: WritingExamIntroScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-canvas gap-8 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center">
        <PenLine className="w-8 h-8 text-emerald-400" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Writing Mock Exam</h1>
        <p className="text-subtle text-sm max-w-sm">
          Two timed tasks — just like the real CELPIP exam. Complete both consecutively.
        </p>
      </div>

      {/* Task summary cards */}
      <div className="w-full max-w-md space-y-3">
        {[task1, task2].map((t) => {
          const mins = Math.floor(t.time_limit_seconds / 60);
          return (
            <div
              key={t.id}
              className="rounded-xl border border-white/[0.08] bg-surface px-4 py-3 flex items-start justify-between gap-4 text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Task {t.task_number}</p>
                <p className="text-xs text-subtle mt-0.5 line-clamp-2">{t.prompt_text}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-subtle bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                {mins}m
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={onStart}
        className="w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                   bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
      >
        <PenLine className="w-4 h-4" />
        Begin Exam
      </button>
    </div>
  );
}
