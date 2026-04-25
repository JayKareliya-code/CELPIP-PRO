"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingExamBreakScreen — 30-second break shown between Task 1 and Task 2.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const pct = Math.max(0, secs / BREAK_SECONDS);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center px-4 py-12 gap-8">

      {/* Completed badge */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-900/40 border border-emerald-700/40">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-300">Task 1 Complete</span>
        </div>
        <p className="text-subtle text-sm">Take a breath — Task 2 begins shortly.</p>
      </div>

      {/* SVG countdown ring */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="144" height="144" viewBox="0 0 144 144">
          <circle cx="72" cy="72" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="72" cy="72" r={radius}
            fill="none"
            stroke={pct > 0.3 ? "#f59e0b" : "#ef4444"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.5s" }}
          />
        </svg>
        <div className="text-center z-10">
          <p className="text-4xl font-bold tabular-nums text-foreground">{secs}</p>
          <p className="text-xs text-subtle mt-0.5">seconds</p>
        </div>
      </div>

      {/* Next task preview */}
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-surface overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.06] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-amber-400">2</span>
          </div>
          <div>
            <p className="text-[10px] text-subtle uppercase tracking-wide font-semibold">Up next</p>
            <p className="text-sm font-bold text-foreground">Task 2 — Opinion Essay</p>
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide mb-1">Quick tip</p>
          <p className="text-xs text-subtle leading-relaxed">
            State your opinion clearly in the first sentence. Support with two strong reasons and finish with a brief conclusion.
          </p>
        </div>
      </div>

      {/* Skip button */}
      <button
        onClick={onContinue}
        className={cn(
          "flex items-center gap-2 px-6 py-3 rounded-xl",
          "bg-primary hover:bg-primary/90 active:scale-[0.98]",
          "text-primary-foreground font-semibold text-sm",
          "border border-amber-400/30",
          "transition-all duration-150"
        )}
      >
        Start Task 2 Now
        <ArrowRight className="w-4 h-4" />
      </button>

      <p className="text-xs text-subtle/40 text-center">
        Task 2 begins automatically when the timer reaches 0.
      </p>
    </div>
  );
}
