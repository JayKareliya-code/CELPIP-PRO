// ─────────────────────────────────────────────────────────────────────────────
// PracticeSkillCard — One card in the /practice hub grid.
//
// Visual language mirrors SpeakingTaskCard / WritingTaskCard exactly:
//   • Coloured gradient splash at the top
//   • Full-card translucent progress fill (left→right) based on tests used
//   • Badge row: skill label + tests chip (or lock icon)
//   • Body: title + meta badges + description + prompt count + chevron
//   • Locked overlay variant
// ─────────────────────────────────────────────────────────────────────────────

import Link                   from "next/link";
import { Clock, Lock, ChevronRight, AlignLeft } from "lucide-react";
import { cn }                  from "@/lib/utils";
import { SKILL_META }          from "@/lib/practice/config";
import type { PracticeQuota }  from "@/lib/practice/types";
import type { Skill }          from "@/lib/types";

interface PracticeSkillCardProps {
  skill:      Skill;
  quota:      PracticeQuota;
  planLabel:  string;
  isLocked?:  boolean;
}

const BADGE_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none select-none";

export function PracticeSkillCard({
  skill,
  quota,
  planLabel,
  isLocked = false,
}: PracticeSkillCardProps) {
  const meta = SKILL_META[skill];
  const Icon = meta.icon;

  // ── Progress fill ──────────────────────────────────────────────────────────
  const fillPct   = isLocked ? 0 : quota.limit > 0
    ? Math.min((quota.used / quota.limit) * 100, 100)
    : 0;
  const fillColor = fillPct >= 100
    ? "rgba(245,158,11,0.12)"  // amber wash when all used (bonus-retry state)
    : skill === "speaking"
      ? "rgba(99,102,241,0.10)"
      : "rgba(16,185,129,0.10)";

  // ── Attempts chip label ────────────────────────────────────────────────────
  const chipLabel = isLocked ? null : `${quota.used}/${quota.limit}`;

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
      {/* ── Layer 0: gradient splash (top) ────────────────────────────────── */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-80 pointer-events-none",
          meta.color.grad,
        )}
      />

      {/* ── Layer 1: full-card progress fill ──────────────────────────────── */}
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

      {/* Top row: skill label + chip */}
      <div className="relative flex items-start justify-between gap-2 px-4 pt-4 pb-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn(BADGE_BASE, "bg-white/[0.07] text-white/50 border-white/[0.10]")}>
            {skill === "speaking" ? "Speaking" : "Writing"}
          </span>
          <span className={cn(BADGE_BASE, meta.color.bg, meta.color.border, meta.color.text)}>
            {skill === "speaking" ? "Mock Exam" : "Mock Exam"}
          </span>
        </div>

        {/* Tests counter chip */}
        {chipLabel && (
          <span
            className={cn(
              "shrink-0 inline-flex items-center rounded-full border px-2.5 py-1",
              "text-xs font-semibold tabular-nums select-none",
              fillPct >= 100
                ? "bg-amber-900/30 border-amber-700/40 text-amber-300"
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
        {/* Title */}
        <h3 className="text-base font-semibold text-foreground leading-snug">{meta.label}</h3>

        {/* Meta badges: duration + task count */}
        <div className="flex items-center gap-3 text-xs text-subtle/80">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {meta.duration}
          </span>
          <span className="w-px h-3 bg-white/10 self-center" />
          <span className="flex items-center gap-1">
            <AlignLeft className="w-3 h-3" />
            {meta.taskSummary}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-subtle leading-relaxed line-clamp-3">{meta.description}</p>

        {/* Remaining count */}
        {!isLocked && (
          <p className="text-[11px] text-white/30">
            {quota.remaining > 0
              ? `${quota.remaining} test${quota.remaining === 1 ? "" : "s"} remaining`
              : "All tests used · Bonus retries available"}
          </p>
        )}

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
  return <Link href={`/practice/${skill}`} className="block h-full">{inner}</Link>;
}
