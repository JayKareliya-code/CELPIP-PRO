"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SpeakingTaskCard — One card in the speaking module home grid.
//
// Progress design: the entire card background fills left-to-right based on
// attempts used / limit. Fill is very low opacity so card text stays legible.
// A thin glowing edge line marks the fill frontier.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { Clock, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/types";

interface SpeakingTaskCardProps {
  taskNumber: number | "practice";
  title: string;
  description: string;
  prepTimeSecs: number;
  responseTimeSecs: number;
  difficulty: Difficulty;
  hasParts?: boolean;
  promptCount: number;
  promptLimit: number;
  attemptsUsed: number;
  attemptsLimit: number | null;
  isBonusRetryMode: boolean;
  isLocked: boolean;
  href: string;
}

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; classes: string }> = {
  easy:   { label: "Easy",   classes: "bg-emerald-900/40 text-emerald-400 border-emerald-800/50" },
  medium: { label: "Medium", classes: "bg-amber-900/40   text-amber-400   border-amber-800/50"  },
  hard:   { label: "Hard",   classes: "bg-red-900/40     text-red-400     border-red-800/50"    },
};

// Gradient splash + fill colour per task
const TASK_META: Record<string, { grad: string; fill: string }> = {
  practice: { grad: "from-violet-600/20 to-violet-900/5",  fill: "rgba(139,92,246,0.10)"  },
  "1":      { grad: "from-indigo-600/20 to-indigo-900/5",  fill: "rgba(99,102,241,0.10)"  },
  "2":      { grad: "from-sky-600/20    to-sky-900/5",      fill: "rgba(14,165,233,0.10)"  },
  "3":      { grad: "from-cyan-600/20   to-cyan-900/5",     fill: "rgba(6,182,212,0.10)"   },
  "4":      { grad: "from-teal-600/20   to-teal-900/5",     fill: "rgba(20,184,166,0.10)"  },
  "5":      { grad: "from-amber-600/20  to-amber-900/5",    fill: "rgba(245,158,11,0.10)"  },
  "6":      { grad: "from-orange-600/20 to-orange-900/5",   fill: "rgba(249,115,22,0.10)"  },
  "7":      { grad: "from-rose-600/20   to-rose-900/5",     fill: "rgba(244,63,94,0.10)"   },
  "8":      { grad: "from-fuchsia-600/20 to-fuchsia-900/5", fill: "rgba(217,70,239,0.10)"  },
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
  const key       = taskNumber === "practice" ? "practice" : String(taskNumber);
  const taskLabel = taskNumber === "practice" ? "Practice" : `Task ${taskNumber}`;
  const diffCfg   = DIFFICULTY_CONFIG[difficulty];
  const meta      = TASK_META[key] ?? TASK_META["1"];

  // ── Progress fill calculation ─────────────────────────────────────────────
  const fillPct = isLocked
    ? 0
    : isBonusRetryMode
      ? 100
      : attemptsLimit && attemptsLimit > 0
        ? Math.min((attemptsUsed / attemptsLimit) * 100, 100)
        : 0;

  const fillColor = isBonusRetryMode ? "rgba(245,158,11,0.12)" : meta.fill;

  // ── Attempts chip label ───────────────────────────────────────────────────
  const chipLabel = isLocked
    ? null
    : isBonusRetryMode
      ? "∞ retries"
      : attemptsLimit !== null
        ? `${attemptsUsed}/${attemptsLimit}`
        : null;

  const inner = (
    <div
      className={cn(
        "group relative rounded-xl border border-white/[0.08] bg-surface overflow-hidden",
        "flex flex-col h-full min-h-[190px] transition-all duration-200",
        isLocked
          ? "opacity-60 cursor-not-allowed"
          : "hover:border-white/[0.16] hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)] cursor-pointer"
      )}
    >
      {/* ── Layer 0: task gradient splash (top) ──────────────────────────── */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-80 pointer-events-none",
          meta.grad,
        )}
      />

      {/* ── Layer 1: full-card background fill (progress) ────────────────── */}
      {fillPct > 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 pointer-events-none transition-all duration-700 ease-out"
          style={{ width: `${fillPct}%` }}
        >
          {/* Translucent colour wash only — no edge line */}
          <div
            className="absolute inset-0"
            style={{ background: fillColor }}
          />
        </div>
      )}

      {/* ── Layer 2: card content ─────────────────────────────────────────── */}

      {/* Top row: task label + difficulty + attempts chip */}
      <div className="relative flex items-start justify-between gap-2 px-4 pt-4 pb-0">
        <div className="flex items-center gap-1.5 flex-wrap">
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

        {/* Attempts counter chip (replaces the ring) */}
        {chipLabel && (
          <span
            className={cn(
              "shrink-0 inline-flex items-center rounded-full border px-2.5 py-1",
              "text-xs font-semibold tabular-nums select-none",
              isBonusRetryMode
                ? "bg-amber-900/30 border-amber-700/40 text-amber-300"
                : fillPct >= 100
                  ? "bg-white/[0.07] border-white/[0.12] text-white/50"
                  : "bg-white/[0.06] border-white/[0.10] text-white/40",
            )}
          >
            {chipLabel}
          </span>
        )}

        {/* Locked icon chip */}
        {isLocked && (
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Lock className="w-3.5 h-3.5 text-white/25" />
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="relative px-4 pt-3 pb-4 flex flex-col gap-3 flex-1">
        {/* Description */}
        <p className="text-sm text-subtle leading-relaxed line-clamp-3">{description}</p>


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

        {/* Chevron */}
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

  return <Link href={href} className="block h-full">{inner}</Link>;
}
