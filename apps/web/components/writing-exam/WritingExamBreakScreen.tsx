"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingExamBreakScreen — 30-second break shown between Task 1 and Task 2.
//
// Auto-advances when countdown reaches zero.
// "Start Task 2 Now" button skips the countdown.
// Mirrors InterTaskBreakScreen from the speaking exam.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { CheckCircle2, Clock, ArrowRight } from "lucide-react";

const BREAK_SECONDS = 30;

interface WritingExamBreakScreenProps {
  onContinue: () => void;
}

export function WritingExamBreakScreen({ onContinue }: WritingExamBreakScreenProps) {
  const [secs, setSecs] = useState(BREAK_SECONDS);

  useEffect(() => {
    if (secs <= 0) { onContinue(); return; }
    const t = setTimeout(() => setSecs((s) => s - 1), 1_000);
    return () => clearTimeout(t);
  }, [secs, onContinue]);

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-canvas gap-8 px-6 text-center">

      <div className="w-16 h-16 rounded-2xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Task 1 Complete!</h1>
        <p className="text-subtle text-sm max-w-sm">
          Great work! Task 2 — Opinion Essay starts in{" "}
          <span className="font-semibold text-foreground">{secs} second{secs !== 1 ? "s" : ""}</span>.
        </p>
      </div>

      {/* Countdown display */}
      <div className="flex items-center gap-2 text-3xl font-mono font-bold text-emerald-400">
        <Clock className="w-7 h-7" />
        {mm}:{ss}
      </div>

      <button
        onClick={onContinue}
        className="flex items-center gap-2 px-6 py-3 rounded-xl
                   bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
      >
        Start Task 2 Now
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
