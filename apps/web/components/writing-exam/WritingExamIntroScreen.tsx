"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingExamIntroScreen — Intro shown before the writing mock starts.
// ─────────────────────────────────────────────────────────────────────────────

import { PenLine, Clock, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WritingTask } from "@/lib/types";

interface WritingExamIntroScreenProps {
  task1: WritingTask;
  task2: WritingTask;
  onStart: () => void;
}

export function WritingExamIntroScreen({ task1, task2, onStart }: WritingExamIntroScreenProps) {
  return (
    <div className="min-h-screen bg-muted flex flex-col">

      {/* Hero */}
      <div className="px-6 py-14 text-center flex flex-col items-center gap-5">

        {/* Icon — subtle, no animation */}
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <PenLine className="w-8 h-8 text-amber-400" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-subtle">
            Full Mock Exam
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            CELPIP Writing Test
          </h1>
        </div>

        {/* Info row */}
        <div className="flex items-center gap-6 text-sm text-subtle mt-1">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400/70" />
            ~53 minutes total
          </span>
          <span className="w-px h-4 bg-white/10" />
          <span className="flex items-center gap-1.5">
            <PenLine className="w-4 h-4 text-amber-400/70" />
            2 written tasks
          </span>
        </div>
      </div>

      {/* Task cards */}
      <div className="flex-1 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/40 mb-3">
          What to expect
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[task1, task2].map((t) => {
            const mins = Math.floor(t.time_limit_seconds / 60);
            const taskMeta = t.task_number === 1
              ? { label: "Email / Letter", description: "Write a formal or informal email responding to a situation." }
              : { label: "Opinion Essay", description: "Write an essay presenting and defending your point of view." };

            return (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                {/* Task number badge */}
                <div className="w-7 h-7 rounded-lg border border-border flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-subtle">{t.task_number}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    Task {t.task_number} — {taskMeta.label}
                  </p>
                  <p className="text-xs text-subtle truncate">{taskMeta.description}</p>
                </div>

                {/* Duration */}
                <span className="text-xs text-subtle/60 shrink-0">{mins}m</span>
              </div>
            );
          })}
        </div>

        {/* Warning + CTA */}
        <div className="max-w-2xl mx-auto mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-surface px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-subtle shrink-0 mt-0.5" />
            <p className="text-xs text-subtle leading-relaxed">
              Once you begin, both tasks run back-to-back with a 30-second break in between.
              Make sure you are in a quiet place with enough time to complete both tasks.
            </p>
          </div>

          <button
            onClick={onStart}
            className={cn(
              "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl",
              "bg-surface hover:bg-surface/80 active:scale-[0.98]",
              "text-foreground font-bold text-base",
              "border border-amber-500/40 hover:border-amber-400/60",
              "transition-all duration-150"
            )}
          >
            Begin Exam
            <ChevronRight className="w-5 h-5 text-amber-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
