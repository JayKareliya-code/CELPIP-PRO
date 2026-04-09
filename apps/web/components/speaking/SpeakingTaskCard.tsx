"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SpeakingTaskCard — One card in the speaking module home grid.
//
// Shows:
//  - Task number badge + difficulty badge
//  - Task title and short description
//  - Timing meta (prep + response)
//  - Attempt ring in top-right corner (used/limit)
//  - Prompt count pill
//  - Locked overlay for Starter plan
//  - Click area → /speaking/{taskNumber}
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { Clock, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskAttemptRing } from "@/components/speaking/TaskAttemptRing";
import type { Difficulty } from "@/lib/types";

interface SpeakingTaskCardProps {
  taskNumber: number | "practice";
  title: string;
  description: string;
  prepTimeSecs: number;
  responseTimeSecs: number;
  difficulty: Difficulty;
  hasParts?: boolean;
  promptCount: number;       // how many active prompts exist in DB for this task
  promptLimit: number;       // plan-based max prompts they will get unique (= plan attempts)
  attemptsUsed: number;
  attemptsLimit: number | null;
  isBonusRetryMode: boolean;
  isLocked: boolean;
  href: string;
}

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; classes: string }> = {
  easy: { label: "Easy", classes: "bg-emerald-900/40 text-emerald-400 border-emerald-800/50" },
  medium: { label: "Medium", classes: "bg-amber-900/40   text-amber-400   border-amber-800/50" },
  hard: { label: "Hard", classes: "bg-red-900/40     text-red-400     border-red-800/50" },
};

const TASK_ACCENT: Record<string, string> = {
  practice: "from-violet-600/20 to-violet-900/5",
  "1": "from-indigo-600/20 to-indigo-900/5",
  "2": "from-sky-600/20    to-sky-900/5",
  "3": "from-cyan-600/20   to-cyan-900/5",
  "4": "from-teal-600/20   to-teal-900/5",
  "5": "from-amber-600/20  to-amber-900/5",
  "6": "from-orange-600/20 to-orange-900/5",
  "7": "from-rose-600/20   to-rose-900/5",
  "8": "from-fuchsia-600/20 to-fuchsia-900/5",
};

const BADGE_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none select-none";

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m`;
}

export function SpeakingTaskCard({
  taskNumber,
  title,
  description,
  prepTimeSecs,
  responseTimeSecs,
  difficulty,
  hasParts = false,
  promptCount,
  promptLimit,
  attemptsUsed,
  attemptsLimit,
  isBonusRetryMode,
  isLocked,
  href,
}: SpeakingTaskCardProps) {
  const key = taskNumber === "practice" ? "practice" : String(taskNumber);
  const taskLabel = taskNumber === "practice" ? "Practice" : `Task ${taskNumber}`;
  const diffCfg = DIFFICULTY_CONFIG[difficulty];
  const accent = TASK_ACCENT[key] ?? TASK_ACCENT["1"];

  const inner = (
    <div
      className={cn(
        "group relative rounded-xl border border-white/[0.08] bg-surface overflow-hidden",
        "flex flex-col gap-0 transition-all duration-200",
        isLocked
          ? "opacity-60 cursor-not-allowed"
          : "hover:border-white/[0.16] hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)] cursor-pointer"
      )}
    >
      {/* Gradient splash at top */}
      <div className={cn("absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-80 pointer-events-none", accent)} />

      {/* Top row: task label + attempt ring */}
      <div className="relative flex items-start justify-between gap-2 px-4 pt-4 pb-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(BADGE_BASE, "bg-white/[0.07] text-white/50 border-white/[0.10]")}>
            {taskLabel}
          </span>
          <span className={cn(BADGE_BASE, diffCfg.classes)}>
            {diffCfg.label}
          </span>
          {hasParts && (
            <span className={cn(BADGE_BASE, "bg-violet-900/40 text-violet-300 border-violet-700/50")}>
              2 parts
            </span>
          )}
        </div>

        {/* Attempt progress ring */}
        {!isLocked ? (
          <div className="shrink-0">
            <TaskAttemptRing
              used={attemptsUsed}
              limit={attemptsLimit}
              isBonusRetry={isBonusRetryMode}
              size={56}
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-white/25" />
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="relative px-4 pt-3 pb-4 flex flex-col gap-3 flex-1">
        {/* Description */}
        <p className="text-sm text-subtle leading-relaxed line-clamp-3">{description}</p>

        {/* Timing row */}
        <div className="flex items-center gap-3 text-xs text-subtle/80">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Prep {formatTime(prepTimeSecs)}
          </span>
          <span className="w-px h-3 bg-white/10 self-center" />
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Speak {formatTime(responseTimeSecs)}
          </span>
        </div>

        {/* Chevron hint */}
        {!isLocked && (
          <div className="flex justify-end mt-auto pt-2 border-t border-white/[0.06]">
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
          </div>
        )}
      </div>

      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-4 rounded-xl">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 border border-white/10 text-xs text-white/40 font-medium backdrop-blur-sm">
            <Lock className="w-3 h-3" />
            Requires Pro or Ultra
          </div>
        </div>
      )}
    </div>
  );

  if (isLocked) return inner;

  return <Link href={href} className="contents">{inner}</Link>;
}
