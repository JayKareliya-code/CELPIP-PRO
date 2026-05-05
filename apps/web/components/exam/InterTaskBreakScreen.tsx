"use client";

// ─────────────────────────────────────────────────────────────────────────────
// InterTaskBreakScreen — Full-screen 30-second break shown between tasks.
//
// Shows:
//   • "Task N Complete ✓" celebration pill
//   • Large animated countdown ring (shared TimerRing component)
//   • "Next up: Task N+1 — [Name]" preview card
//   • Coaching tip specific to the next task
// ─────────────────────────────────────────────────────────────────────────────

import { CheckCircle2, Mic, Clock } from "lucide-react";
import { TimerRing }    from "@/components/common/TimerRing";
import { TimerDisplay } from "@/components/common/TimerDisplay";
import { MOCK_EXAM_BREAK_SECONDS }  from "@/lib/practice/config";
import type { MockExamTask }        from "@/lib/types";

// ── Task coaching tips ────────────────────────────────────────────────────────

const NEXT_TASK_TIPS: Record<number, string> = {
  1: "Give specific, actionable advice. Use phrases like 'I would suggest that you…' or 'One thing you could try is…'",
  2: "Use past tense and include vivid details — where, when, who was involved, and how it made you feel.",
  3: "Describe objects, people, and their actions from top to bottom, left to right. Use 'In the foreground I can see…'",
  4: "Make at least two predictions using 'I think… because…' Connect your predictions to what you see in each image.",
  5: "Structure your response: choose your option → explain why → argue for the other side with 'On the other hand…'",
  6: "Be polite but direct. Clearly state the problem, what you need, and a specific deadline if possible.",
  7: "State your opinion clearly in the first sentence. Support with two reasons and a brief conclusion.",
  8: "Tell a story: describe what you see → explain how it happened → predict what will happen next.",
};

const TASK_LABELS: Record<number, string> = {
  1: "Giving Advice",
  2: "Talking about a Personal Experience",
  3: "Describing a Scene",
  4: "Making Predictions",
  5: "Comparing and Persuading",
  6: "Dealing with a Difficult Situation",
  7: "Expressing Opinions",
  8: "Describing an Unusual Situation",
};

// ── Countdown ring — uses shared TimerRing + TimerDisplay ─────────────────────

// ── Component ─────────────────────────────────────────────────────────────────

interface InterTaskBreakScreenProps {
  completedTask: MockExamTask;
  nextTask:      MockExamTask | null;
  breakSecondsLeft: number;
}

export function InterTaskBreakScreen({
  completedTask,
  nextTask,
  breakSecondsLeft,
}: InterTaskBreakScreenProps) {
  const tip = nextTask ? NEXT_TASK_TIPS[nextTask.taskNumber] : null;

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-12 gap-8">

      {/* Completed badge */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-900/40 border border-emerald-700/40">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-300">
            Task {completedTask.taskNumber} Complete
          </span>
        </div>
        <p className="text-subtle text-sm">Take a breath — next task begins shortly.</p>
      </div>

      {/* Countdown ring — shared components for visual consistency */}
      <div className="relative flex items-center justify-center">
        <TimerRing
          secondsLeft={breakSecondsLeft}
          totalSeconds={MOCK_EXAM_BREAK_SECONDS}
          sizePx={144}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <TimerDisplay
            secondsLeft={breakSecondsLeft}
            variant="dark"
            size="lg"
          />
        </div>
      </div>

      {/* Next task preview */}
      {nextTask && (
        <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-surface overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-white/[0.06] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-subtle uppercase tracking-wide font-semibold">Up next</p>
              <p className="text-sm font-bold text-foreground">
                Task {nextTask.taskNumber} — {TASK_LABELS[nextTask.taskNumber]}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-xs text-subtle/60 shrink-0">
              <Clock className="w-3 h-3" />
              {nextTask.prompt.prep_time_seconds}s prep
            </div>
          </div>

          {/* Coaching tip */}
          {tip && (
            <div className="px-4 py-3">
              <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide mb-1">
                Quick tip
              </p>
              <p className="text-xs text-subtle leading-relaxed">{tip}</p>
            </div>
          )}
        </div>
      )}

      {/* Auto-advance note */}
      <p className="text-xs text-subtle/40 text-center">
        Next task begins automatically when the timer reaches 0.
      </p>
    </div>
  );
}
