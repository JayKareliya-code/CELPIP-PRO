"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingTaskCard — Single card in the writing module home grid.
//
// Unified layout (identical structure to SpeakingTaskCard & PracticeSkillCard):
//   • Layer 0: gradient splash (top, h-20)
//   • Layer 1: progress fill wash (left→right)
//   • Layer 2: content
//       ┌─ badge row (task label + type + attempts chip / lock)
//       ├─ icon + title
//       ├─ meta row (time · word count)
//       ├─ description (line-clamp-2, flex-1)
//       └─ footer (prompt count · chevron)   pinned to bottom
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { PenLine, Clock, AlignLeft, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingTaskCardProps {
  taskNumber:    1 | 2;
  title:         string;
  taskType:      string;        // "Email Format" | "Opinion Essay"
  timeLimitSecs: number;
  minWords:      number;
  maxWords:      number | null;
  description:   string;
  promptCount:   number;        // total available prompts for this task
  attemptsUsed:  number;
  attemptsLimit: number | null; // null = unlimited
  isBonusRetryMode: boolean;
  isLocked:      boolean;
  href:          string;
}

// ── Task colour palette ───────────────────────────────────────────────────────

const TASK_META: Record<number, { grad: string; fill: string }> = {
  1: { grad: "from-amber-600/20  to-amber-900/5",  fill: "rgba(245,158,11,0.10)" },
  2: { grad: "from-yellow-600/20 to-yellow-900/5", fill: "rgba(202,138,4,0.10)"  },
};

const BADGE_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none select-none";

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WritingTaskCard({
  taskNumber,
  title,
  taskType,
  timeLimitSecs,
  minWords,
  maxWords,
  description,
  promptCount,
  attemptsUsed,
  attemptsLimit,
  isBonusRetryMode,
  isLocked,
  href,
}: WritingTaskCardProps) {
  const meta = TASK_META[taskNumber] ?? TASK_META[1];

  // ── Progress fill ──────────────────────────────────────────────────────────
  const fillPct = isLocked
    ? 0
    : isBonusRetryMode
      ? 100
      : attemptsLimit && attemptsLimit > 0
        ? Math.min((attemptsUsed / attemptsLimit) * 100, 100)
        : 0;

  const fillColor = isBonusRetryMode ? "rgba(245,158,11,0.12)" : meta.fill;

  // ── Attempts chip label ────────────────────────────────────────────────────
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
        "group relative rounded-xl border border-border bg-surface overflow-hidden",
        "flex flex-col h-full min-h-[220px] transition-all duration-200",
        isLocked
          ? "opacity-60 cursor-not-allowed"
          : "hover:border-white/[0.18] hover:shadow-[0_4px_20px_rgba(0,0,0,0.35)] cursor-pointer"
      )}
    >
      {/* ── Layer 0: gradient splash (top) ──────────────────────────────── */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-20 bg-gradient-to-b opacity-80 pointer-events-none",
          meta.grad,
        )}
      />

      {/* ── Layer 1: progress fill wash ──────────────────────────────────── */}
      {fillPct > 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 pointer-events-none transition-all duration-700 ease-out"
          style={{ width: `${fillPct}%` }}
        >
          <div className="absolute inset-0" style={{ background: fillColor }} />
        </div>
      )}

      {/* ── Layer 2: card content ─────────────────────────────────────────── */}
      <div className="relative flex flex-col h-full px-4 pt-4 pb-4 gap-0">

        {/* ── Row 1: badge strip ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn(BADGE_BASE, "bg-white/[0.07] text-white/50 border-white/[0.10]")}>
              Task {taskNumber}
            </span>
            <span className={cn(BADGE_BASE, "bg-primary/10 text-primary border-primary/20")}>
              {taskType}
            </span>
          </div>

          {/* Attempts chip */}
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

          {/* Locked icon */}
          {isLocked && (
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Lock className="w-3.5 h-3.5 text-white/25" />
            </div>
          )}
        </div>

        {/* ── Row 2: icon + title ────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-amber-600/15 border border-amber-500/20 flex items-center justify-center shrink-0">
            <PenLine className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{title}</h3>
        </div>

        {/* ── Row 3: meta row ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 text-xs text-subtle/80 mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(timeLimitSecs)}
          </span>
          <span className="w-px h-3 bg-white/10 self-center" />
          <span className="flex items-center gap-1">
            <AlignLeft className="w-3 h-3" />
            {maxWords != null ? `${minWords}–${maxWords} words` : `${minWords}+ words`}
          </span>
        </div>

        {/* ── Row 4: description (flex-1, pushes footer down) ──────────── */}
        <p className="text-sm text-subtle leading-relaxed line-clamp-2 flex-1">{description}</p>

        {/* ── Row 5: footer ─────────────────────────────────────────────── */}
        {!isLocked && (
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06]">
            <span className="text-[11px] text-white/30">
              {promptCount > 0 ? `${promptCount} prompt${promptCount !== 1 ? "s" : ""}` : ""}
            </span>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-amber-400/70 transition-colors" />
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
