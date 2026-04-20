"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ExamIntroScreen — Pre-exam overview screen shown in the READY phase.
//
// Displays:
//   • Hero header with mic icon + animated gradient
//   • Task list — all 8 tasks with estimated durations
//   • Total estimated time
//   • Prominent "Begin Exam" CTA
// ─────────────────────────────────────────────────────────────────────────────

import { Mic, Clock, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_EXAM_TASK_NUMBERS } from "@/lib/practice/config";

const TASK_META: Record<number, { label: string; duration: string; description: string }> = {
  1: { label: "Giving Advice",                   duration: "1m 30s", description: "Respond with relevant advice to a scenario." },
  2: { label: "Talking about a Personal Experience", duration: "1m",  description: "Describe a personal event or memory." },
  3: { label: "Describing a Scene",              duration: "1m",     description: "Look at an image and describe what you see." },
  4: { label: "Making Predictions",              duration: "1m",     description: "Study three images and make predictions." },
  5: { label: "Comparing and Persuading",        duration: "2m",     description: "Compare options and argue both sides." },
  6: { label: "Dealing with a Difficult Situation", duration: "1m",  description: "Respond to a real-life problem scenario." },
  7: { label: "Expressing Opinions",             duration: "1m 30s", description: "Share and defend your opinion on a topic." },
  8: { label: "Describing an Unusual Situation", duration: "1m",     description: "Describe an unusual image and its story." },
};

interface ExamIntroScreenProps {
  onStart: () => void;
}

export function ExamIntroScreen({ onStart }: ExamIntroScreenProps) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Hero */}
      <div className="relative overflow-hidden px-6 py-14 text-center flex flex-col items-center gap-5">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/30 via-canvas to-canvas pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-indigo-600/10 blur-3xl rounded-full pointer-events-none" />

        {/* Icon */}
        <div className="relative w-20 h-20 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-900/20">
          <div className="absolute inset-0 rounded-2xl border border-indigo-400/20 animate-ping opacity-40" />
          <Mic className="w-10 h-10 text-indigo-400" />
        </div>

        {/* Title */}
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/40 border border-indigo-700/40 text-indigo-300 text-xs font-semibold">
            Full Mock Exam
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            CELPIP Speaking Test
          </h1>
          <p className="text-subtle text-sm max-w-md mx-auto">
            8 tasks, timed just like the real exam. Once started, the session
            runs continuously. Make sure you&apos;re in a quiet place.
          </p>
        </div>

        {/* Info row */}
        <div className="relative z-10 flex items-center gap-6 text-sm text-subtle mt-2">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-400" />
            ~25 minutes total
          </span>
          <span className="w-px h-4 bg-white/10" />
          <span className="flex items-center gap-1.5">
            <Mic className="w-4 h-4 text-indigo-400" />
            8 recorded tasks
          </span>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 px-4 pb-4 max-w-2xl mx-auto w-full">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/40 mb-3">
          What to expect
        </h2>

        <div className="space-y-2">
          {MOCK_EXAM_TASK_NUMBERS.map((n, i) => {
            const meta = TASK_META[n];
            return (
              <div
                key={n}
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-surface px-4 py-3"
              >
                {/* Task number badge */}
                <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-indigo-400">{n}</span>
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

        {/* Warning */}
        <div className="mt-4 rounded-xl border border-amber-700/25 bg-amber-950/20 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/80 leading-relaxed">
            Once you begin, the exam runs continuously with 30-second breaks between tasks.
            A microphone is required. Make sure your browser has permission.
          </p>
        </div>

        {/* CTA */}
        <button
          id="begin-exam-btn"
          onClick={onStart}
          className={cn(
            "mt-6 w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl",
            "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]",
            "text-white font-bold text-base",
            "border border-indigo-400/30 hover:border-indigo-300/50",
            "shadow-lg shadow-indigo-900/40",
            "transition-all duration-150"
          )}
        >
          Begin Exam
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
