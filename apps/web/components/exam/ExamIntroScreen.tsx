"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ExamIntroScreen — Pre-exam overview screen shown in the READY phase.
// ─────────────────────────────────────────────────────────────────────────────

import { Mic, Clock, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_EXAM_TASK_NUMBERS } from "@/lib/practice/config";

const TASK_META: Record<number, { label: string; duration: string; description: string }> = {
  1: { label: "Giving Advice", duration: "1m 30s", description: "Respond with relevant advice to a scenario." },
  2: { label: "Talking about a Personal Experience", duration: "1m", description: "Describe a personal event or memory." },
  3: { label: "Describing a Scene", duration: "1m", description: "Look at an image and describe what you see." },
  4: { label: "Making Predictions", duration: "1m", description: "Study three images and make predictions." },
  5: { label: "Comparing and Persuading", duration: "2m", description: "Compare options and argue both sides." },
  6: { label: "Dealing with a Difficult Situation", duration: "1m", description: "Respond to a real-life problem scenario." },
  7: { label: "Expressing Opinions", duration: "1m 30s", description: "Share and defend your opinion on a topic." },
  8: { label: "Describing an Unusual Situation", duration: "1m", description: "Describe an unusual image and its story." },
};

interface ExamIntroScreenProps {
  onStart: () => void;
}

export function ExamIntroScreen({ onStart }: ExamIntroScreenProps) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Hero */}
      <div className="px-6 py-14 text-center flex flex-col items-center gap-5">

        {/* Icon — subtle, no animation */}
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <Mic className="w-8 h-8 text-amber-400" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-subtle">
            Full Mock Exam
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            CELPIP Speaking Test
          </h1>
        </div>

        {/* Info row */}
        <div className="flex items-center gap-6 text-sm text-subtle mt-1">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400/70" />
            ~25 minutes total
          </span>
          <span className="w-px h-4 bg-white/10" />
          <span className="flex items-center gap-1.5">
            <Mic className="w-4 h-4 text-amber-400/70" />
            8 recorded tasks
          </span>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/40 mb-3">
          What to expect
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MOCK_EXAM_TASK_NUMBERS.map((n) => {
            const meta = TASK_META[n];
            return (
              <div
                key={n}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                {/* Task number badge */}
                <div className="w-7 h-7 rounded-lg border border-border flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-subtle">{n}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    Task {n} — {meta.label}
                  </p>
                  <p className="text-xs text-subtle truncate">{meta.description}</p>
                </div>

                {/* Duration */}
                <span className="text-xs text-subtle/60 shrink-0">{meta.duration}</span>
              </div>
            );
          })}
        </div>

        {/* Warning + CTA — constrained width for readability */}
        <div className="max-w-2xl mx-auto mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-surface px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-subtle shrink-0 mt-0.5" />
            <p className="text-xs text-subtle leading-relaxed">
              Once you begin, the exam runs continuously with 30-second breaks between tasks.
              A microphone is required. Make sure your browser has permission.
            </p>
          </div>

          <button
            id="begin-exam-btn"
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
