"use client";

import { Lock } from "lucide-react";
import { TaskMetaBadges } from "@/components/speaking/TaskMetaBadges";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/types";

interface TaskCardProps {
  taskNumber: number | "practice";
  title: string;
  prepTimeSecs: number;
  responseTimeSecs: number;
  difficulty: Difficulty;
  /** True for Task 5 — shows 2-parts indicator */
  hasParts?: boolean;
  /** True when user's plan doesn't include this task */
  isLocked?: boolean;
  /** Called when the "Start Practice" button is clicked */
  onStartClick: () => void;
}

const difficultyConfig: Record<Difficulty, { label: string; classes: string }> = {
  easy:   { label: "Easy",   classes: "bg-emerald-900/40 text-emerald-400 border-emerald-800/50" },
  medium: { label: "Medium", classes: "bg-amber-900/40   text-amber-400   border-amber-800/50"  },
  hard:   { label: "Hard",   classes: "bg-red-900/40     text-red-400     border-red-800/50"    },
};

/**
 * Shared structural classes for every pill badge on this card.
 * Only the colour trio (bg / text / border) changes per badge — shape, size,
 * and border style are guaranteed identical across all of them.
 */
const BADGE_BASE =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium leading-none select-none";

/**
 * Single speaking task card — strictly one responsibility: render one task.
 * All interaction surfaced via `onStartClick`; no routing logic here.
 */
export function TaskCard({
  taskNumber,
  title,
  prepTimeSecs,
  responseTimeSecs,
  difficulty,
  hasParts = false,
  isLocked = false,
  onStartClick,
}: TaskCardProps) {
  const diffCfg = difficultyConfig[difficulty];
  const taskLabel = taskNumber === "practice" ? "Practice" : `Task ${taskNumber}`;

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface shadow-card p-5 flex flex-col gap-3 transition-shadow duration-150",
        isLocked ? "opacity-60" : "hover:shadow-panel"
      )}
    >
      {/* ── Header row ────────────────────────────────────────────────────────
          Both badges share BADGE_BASE — identical rounded-full pill shape,
          identical border width, identical padding. Only colours differ.    */}
      <div className="flex items-center justify-between gap-2">

        {/* Task label badge */}
        <span className={cn(BADGE_BASE, "bg-white/[0.06] text-white/50 border-white/[0.10]")}>
          {taskLabel}
        </span>

        {/* Difficulty badge */}
        <span className={cn(BADGE_BASE, diffCfg.classes)}>
          {diffCfg.label}
        </span>

      </div>

      {/* Task title */}
      <h3 className="text-base font-semibold text-foreground leading-snug">
        {title}
      </h3>

      {/* Timing meta-badges */}
      <TaskMetaBadges
        prepTimeSecs={prepTimeSecs}
        responseTimeSecs={responseTimeSecs}
        hasParts={hasParts}
      />

      {/* Start Practice CTA */}
      <button
        onClick={onStartClick}
        disabled={isLocked}
        className={cn(
          "mt-auto w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
          "text-sm font-semibold transition-all duration-150",
          isLocked
            ? "bg-white/5 text-white/25 cursor-not-allowed border border-white/[0.10]"
            : "bg-amber-600/70 hover:bg-amber-600/90 text-amber-100 border border-amber-500/40 hover:border-amber-400/60"
        )}
      >
        {isLocked ? (
          <>
            <Lock className="w-3.5 h-3.5" />
            Locked
          </>
        ) : (
          "Start Practice"
        )}
      </button>
    </div>
  );
}
