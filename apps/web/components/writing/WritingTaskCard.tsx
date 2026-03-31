// ─────────────────────────────────────────────────────────────────────────────
// WritingTaskCard.tsx — Single writing task card shown in the task grid
// ─────────────────────────────────────────────────────────────────────────────

import Link                 from "next/link";
import { PenLine, Lock }    from "lucide-react";
import { WritingMetaBadges } from "@/components/writing/WritingMetaBadges";
import { cn }               from "@/lib/utils";
import type { WritingTask } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingTaskCardProps {
  task:      WritingTask;
  isLocked?: boolean;
}

// ── Badge base ─────────────────────────────────────────────────────────────────

const BADGE_BASE =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium leading-none select-none";

/**
 * Full writing task card — renders all task metadata and a CTA.
 *
 * Larger than the speaking TaskCard (more content-focused per the plan).
 * Links directly to the instruction page — no onStartClick callback needed
 * because the instruction page is always accessible (unlike speaking tasks).
 */
export function WritingTaskCard({ task, isLocked = false }: WritingTaskCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface shadow-card p-6 flex flex-col gap-4",
        "transition-shadow duration-150",
        isLocked ? "opacity-60" : "hover:shadow-panel"
      )}
    >
      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        {/* Task number badge */}
        <span className={cn(BADGE_BASE, "bg-white/[0.06] text-white/50 border-white/[0.10]")}>
          Task {task.task_number}
        </span>

        {/* Task type badge (e.g. "Email Format") */}
        <span className={cn(BADGE_BASE, "bg-primary/10 text-primary border-primary/20")}>
          {task.task_type}
        </span>
      </div>

      {/* ── Title ──────────────────────────────────────────────────────────── */}
      <h3 className="text-xl font-semibold text-foreground leading-snug">
        {task.title}
      </h3>

      {/* ── Meta badges ────────────────────────────────────────────────────── */}
      <WritingMetaBadges
        timeLimitSeconds={task.time_limit_seconds}
        minWords={task.min_words}
        maxWords={task.max_words}
      />

      {/* ── Short description ──────────────────────────────────────────────── */}
      <p className="text-sm text-subtle leading-relaxed line-clamp-3">
        {task.prompt_text}
      </p>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      {isLocked ? (
        <button
          disabled
          className="mt-auto w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                     bg-white/5 text-white/25 cursor-not-allowed border border-white/[0.10]
                     text-sm font-semibold"
        >
          <Lock className="w-3.5 h-3.5" />
          Locked
        </button>
      ) : (
        <Link
          href={`/writing/${task.id}`}
          className="mt-auto w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                     bg-indigo-600/70 hover:bg-indigo-600/90 text-indigo-100
                     border border-indigo-500/40 hover:border-indigo-400/60
                     text-sm font-semibold transition-all duration-150"
        >
          <PenLine className="w-4 h-4" />
          View Task &amp; Start
        </Link>
      )}
    </div>
  );
}
