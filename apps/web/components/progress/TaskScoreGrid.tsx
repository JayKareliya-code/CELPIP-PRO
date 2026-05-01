"use client";

// ─────────────────────────────────────────────────────────────────────────────
// TaskScoreGrid.tsx — Grid of per-task progress cards for the Progress page.
//
// Speaking: 8 task cards in a responsive grid (4 col → 2 col → 1 col)
// Writing:  2 task cards side-by-side
//
// Each card shows:
//   - Task number badge + name
//   - Attempt count
//   - Best band (colour-coded)
//   - Avg band
//   - Mini SVG sparkline (if ≥ 2 attempts)
//   - "Practice" / "Try this task" CTA button
//
// Tasks with 0 attempts get a distinct "Untried" empty state.
// ─────────────────────────────────────────────────────────────────────────────

import Link              from "next/link";
import { ArrowRight, Mic, PenLine, Zap } from "lucide-react";
import { cn }             from "@/lib/utils";
import { formatBand, getBandColourClass } from "@/lib/utils";
import { ScoreSparkline } from "@/components/progress/ScoreSparkline";
import type { TaskProgressStat } from "@/lib/hooks/useProgressData";
import type { Skill } from "@/lib/types";

// ── Task metadata ─────────────────────────────────────────────────────────────

const SPEAKING_TASKS: Record<number, string> = {
  1: "Giving Advice",
  2: "Talking about a Personal Experience",
  3: "Describing a Scene",
  4: "Making Predictions",
  5: "Comparing & Persuading",
  6: "Dealing with a Difficult Situation",
  7: "Expressing Opinions",
  8: "Describing an Unusual Situation",
};

const WRITING_TASKS: Record<number, string> = {
  1: "Writing an Email",
  2: "Responding to a Survey / Essay",
};

function getTaskName(skill: Skill, taskNumber: number): string {
  if (skill === "speaking") return SPEAKING_TASKS[taskNumber] ?? `Task ${taskNumber}`;
  return WRITING_TASKS[taskNumber] ?? `Task ${taskNumber}`;
}

function getPracticeHref(skill: Skill, taskNumber: number): string {
  if (skill === "speaking") return `/speaking/${taskNumber}`;
  return `/writing/${taskNumber}`;
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-5 w-12 rounded-full bg-border" />
        <div className="h-4 flex-1 rounded bg-border" />
      </div>
      <div className="h-7 w-10 rounded bg-border" />
      <div className="h-8 w-full rounded bg-border opacity-50" />
      <div className="h-6 w-20 rounded-full bg-border" />
    </div>
  );
}

// ── Untried (empty) task card ─────────────────────────────────────────────────

function UntriedTaskCard({ skill, taskNumber }: { skill: Skill; taskNumber: number }) {
  const name = getTaskName(skill, taskNumber);
  const href = getPracticeHref(skill, taskNumber);
  const Icon = skill === "speaking" ? Mic : PenLine;

  return (
    <div
      className={cn(
        "group flex flex-col gap-3 rounded-xl border border-dashed border-border/60 bg-surface/40",
        "p-4 transition-all duration-200 hover:border-primary/40 hover:bg-surface",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-border/30 px-2 py-0.5 text-[10px] font-semibold text-subtle">
          <Icon className="h-2.5 w-2.5" />
          Task {taskNumber}
        </span>
      </div>

      {/* Name */}
      <p className="text-sm font-medium text-subtle/70 leading-snug">{name}</p>

      {/* Not yet attempted indicator */}
      <p className="text-xs text-subtle/50">Not yet attempted</p>

      {/* CTA */}
      <Link
        href={href}
        className={cn(
          "mt-auto inline-flex items-center gap-1.5 self-start rounded-lg border border-border/60 px-3 py-1.5",
          "text-xs font-semibold text-subtle transition-all duration-200",
          "group-hover:border-primary/50 group-hover:text-primary",
        )}
      >
        <Zap className="h-3 w-3" />
        Try this task
      </Link>
    </div>
  );
}

// ── Attempted task card ───────────────────────────────────────────────────────

interface AttemptedTaskCardProps {
  skill:    Skill;
  taskNumber: number;
  stat:     TaskProgressStat;
}

function AttemptedTaskCard({ skill, taskNumber, stat }: AttemptedTaskCardProps) {
  const name = getTaskName(skill, taskNumber);
  const href = getPracticeHref(skill, taskNumber);
  const Icon = skill === "speaking" ? Mic : PenLine;

  const bestBandClass = stat.best_band != null ? getBandColourClass(stat.best_band) : "";

  return (
    <div
      className={cn(
        "group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4",
        "transition-all duration-200 hover:border-primary/40 hover:shadow-card-hover",
      )}
    >
      {/* Header: badge + task name */}
      <div className="flex items-start gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary shrink-0">
          <Icon className="h-2.5 w-2.5" />
          Task {taskNumber}
        </span>
        <p className="text-xs font-medium text-foreground/80 leading-snug line-clamp-2">{name}</p>
      </div>

      {/* Scores row */}
      <div className="flex items-baseline gap-3">
        {/* Best band — large + colour-coded */}
        <div>
          <p className="text-[9px] uppercase tracking-wider text-subtle mb-0.5">Best</p>
          <p className={cn("text-2xl font-bold tabular-nums leading-none", bestBandClass)}>
            {stat.best_band != null ? formatBand(stat.best_band) : "—"}
          </p>
        </div>
        {/* Avg band */}
        <div>
          <p className="text-[9px] uppercase tracking-wider text-subtle mb-0.5">Avg</p>
          <p className="text-base font-semibold tabular-nums text-foreground/70 leading-none">
            {stat.avg_band != null ? formatBand(stat.avg_band) : "—"}
          </p>
        </div>
        {/* Attempt count */}
        <div className="ml-auto">
          <p className="text-[9px] uppercase tracking-wider text-subtle mb-0.5 text-right">Attempts</p>
          <p className="text-base font-semibold tabular-nums text-foreground/70 leading-none text-right">
            {stat.attempt_count}
          </p>
        </div>
      </div>

      {/* Sparkline */}
      <div className="flex items-center gap-2">
        <ScoreSparkline
          scores={stat.scores}
          trend={stat.trend}
          width={84}
          height={28}
        />
        {stat.scores.length >= 2 && (
          <span className={cn(
            "text-[10px] font-semibold",
            stat.trend === "up"     && "text-success",
            stat.trend === "down"   && "text-danger",
            stat.trend === "steady" && "text-warning",
          )}>
            {stat.trend === "up"     && "▲ Improving"}
            {stat.trend === "down"   && "▼ Declining"}
            {stat.trend === "steady" && "→ Steady"}
          </span>
        )}
      </div>

      {/* Practice CTA */}
      <Link
        href={href}
        className={cn(
          "mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/30",
          "bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary",
          "transition-all duration-200 hover:bg-primary/15 hover:border-primary/60",
        )}
      >
        Practice again <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── Grid ──────────────────────────────────────────────────────────────────────

interface TaskScoreGridProps {
  skill:     Skill;
  taskStats: Map<number, TaskProgressStat>;
  isLoading: boolean;
}

export function TaskScoreGrid({ skill, taskStats, isLoading }: TaskScoreGridProps) {
  const taskNumbers = skill === "speaking"
    ? [1, 2, 3, 4, 5, 6, 7, 8]
    : [1, 2];

  const gridClass = skill === "speaking"
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    : "grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl";

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-subtle mb-4">
        {skill === "speaking" ? "Speaking Tasks (1–8)" : "Writing Tasks (1–2)"}
      </h2>
      <div className={gridClass}>
        {isLoading
          ? taskNumbers.map((n) => <SkeletonCard key={n} />)
          : taskNumbers.map((taskNumber) => {
              const stat = taskStats.get(taskNumber);
              if (!stat) {
                return (
                  <UntriedTaskCard key={taskNumber} skill={skill} taskNumber={taskNumber} />
                );
              }
              return (
                <AttemptedTaskCard key={taskNumber} skill={skill} taskNumber={taskNumber} stat={stat} />
              );
            })
        }
      </div>
    </section>
  );
}
