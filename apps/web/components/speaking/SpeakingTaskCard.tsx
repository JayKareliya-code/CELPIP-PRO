"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SpeakingTaskCard — One card in the speaking module home grid.
//
// Unified layout (identical structure to WritingTaskCard & PracticeSkillCard):
//   • Layer 0: gradient splash (top, h-20)
//   • Layer 1: progress fill wash (left→right)
//   • Layer 2: content
//       ┌─ badge row (task label + difficulty + attempts chip / lock)
//       ├─ icon + title
//       ├─ meta row (prep time · speak time)
//       ├─ description (line-clamp-2, flex-1)
//       └─ footer (prompt count · chevron)   pinned to bottom
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { Mic, Clock, Lock, ChevronRight } from "lucide-react";
import { cn, formatShortDuration } from "@/lib/utils";
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
  attemptsUsed: number;
  attemptsLimit: number | null;
  isLocked: boolean;
  href: string;
}


// Gradient splash + fill colour per task — unified amber-gold spectrum
const TASK_META: Record<string, { grad: string; fill: string }> = {
  practice: { grad: "from-amber-600/20   to-amber-900/5",    fill: "rgba(245,158,11,0.10)"  },
  "1":      { grad: "from-amber-500/20   to-amber-900/5",    fill: "rgba(217,119,6,0.10)"   },
  "2":      { grad: "from-yellow-600/20  to-yellow-900/5",   fill: "rgba(202,138,4,0.10)"   },
  "3":      { grad: "from-orange-500/20  to-orange-900/5",   fill: "rgba(234,88,12,0.10)"   },
  "4":      { grad: "from-amber-700/20   to-amber-950/5",    fill: "rgba(180,83,9,0.10)"    },
  "5":      { grad: "from-yellow-500/20  to-yellow-900/5",   fill: "rgba(161,98,7,0.10)"    },
  "6":      { grad: "from-orange-600/20  to-orange-900/5",   fill: "rgba(194,65,12,0.10)"   },
  "7":      { grad: "from-amber-400/20   to-amber-800/5",    fill: "rgba(251,191,36,0.10)"  },
  "8":      { grad: "from-yellow-700/20  to-yellow-950/5",   fill: "rgba(133,77,14,0.10)"   },
};

const BADGE_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none select-none";

export function SpeakingTaskCard({
  taskNumber,
  title,
  description,
  prepTimeSecs,
  responseTimeSecs,
  promptCount,
  attemptsUsed,
  attemptsLimit,
  isLocked,
  href,
}: SpeakingTaskCardProps) {
  const key       = taskNumber === "practice" ? "practice" : String(taskNumber);
  const taskLabel = taskNumber === "practice" ? "Practice" : `Task ${taskNumber}`;
  const meta      = TASK_META[key] ?? TASK_META["1"];

  // ── Progress fill ──────────────────────────────────────────────────────
  const fillPct = isLocked
    ? 0
    : attemptsLimit && attemptsLimit > 0
      ? Math.min((attemptsUsed / attemptsLimit) * 100, 100)
      : 0;

  // ── Attempts chip label ───────────────────────────────────────────────
  const chipLabel = isLocked
    ? null
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

      {/* ── Layer 1: progress fill wash ──────────────────────────────────── */}
      {fillPct > 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 pointer-events-none transition-all duration-700 ease-out"
          style={{ width: `${fillPct}%` }}
        >
          <div className="absolute inset-0" style={{ background: meta.fill }} />
        </div>
      )}

      {/* ── Layer 2: card content ─────────────────────────────────────────── */}
      <div className="relative flex flex-col h-full px-4 pt-4 pb-4 gap-0">

        {/* ── Row 1: badge strip ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn(BADGE_BASE, "bg-white/[0.08] text-white/70 border-white/[0.12] tracking-wide text-[10px] font-bold uppercase")}>
              {taskLabel}
            </span>
          </div>

          {/* Attempts chip */}
          {chipLabel && (
            <span
              className={cn(
                "shrink-0 inline-flex items-center rounded-full border px-2.5 py-1",
                "text-xs font-semibold tabular-nums select-none",
                fillPct >= 100
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
            <Mic className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-base font-bold text-foreground leading-snug line-clamp-2 tracking-tight">{title}</h3>
        </div>

        {/* ── Row 3: meta row ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 text-[11px] font-medium text-subtle mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400/60" />
            <span>Prep <span className="text-foreground/60">{formatShortDuration(prepTimeSecs)}</span></span>
          </span>
          <span className="w-px h-3 bg-white/10 self-center" />
          <span className="flex items-center gap-1">
            <Mic className="w-3 h-3 text-amber-400/60" />
            <span>Speak <span className="text-foreground/60">{formatShortDuration(responseTimeSecs)}</span></span>
          </span>
        </div>

        {/* ── Row 4: description (flex-1, pushes footer down) ──────────── */}
        <p className="text-sm text-foreground/55 leading-relaxed line-clamp-2 flex-1">{description}</p>

        {/* ── Row 5: footer ─────────────────────────────────────────────── */}
        {!isLocked && (
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06]">
            <span className="text-[11px] text-white/40 font-medium">
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
            Requires Pro
          </div>
        </div>
      )}
    </div>
  );

  if (isLocked) return inner;

  return <Link href={href} className="block h-full">{inner}</Link>;
}
