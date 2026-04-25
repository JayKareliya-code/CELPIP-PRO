// ─────────────────────────────────────────────────────────────────────────────
// PracticeSkillCard — One card in the /practice hub grid.
//
// Unified layout (identical structure to SpeakingTaskCard & WritingTaskCard):
//   • Layer 0: gradient splash (top, h-20)
//   • Layer 1: progress fill wash (left→right)
//   • Layer 2: content
//       ┌─ badge row (skill label + "Mock Exam" + tests chip / lock)
//       ├─ icon + title
//       ├─ meta row (duration · task summary)
//       ├─ description (line-clamp-2, flex-1)
//       └─ footer (remaining tests · chevron)  pinned to bottom
// ─────────────────────────────────────────────────────────────────────────────

import Link                   from "next/link";
import { Clock, AlignLeft, Lock, ChevronRight } from "lucide-react";
import { cn }                  from "@/lib/utils";
import { SKILL_META }          from "@/lib/practice/config";
import type { PracticeQuota }  from "@/lib/practice/types";
import type { Skill }          from "@/lib/types";

interface PracticeSkillCardProps {
  skill:      Skill;
  quota:      PracticeQuota;
  planLabel?:  string;
  isLocked?:  boolean;
}

const BADGE_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none select-none";

export function PracticeSkillCard({
  skill,
  quota,
  isLocked = false,
}: PracticeSkillCardProps) {
  const meta = SKILL_META[skill];
  const Icon = meta.icon;

  // ── Progress fill ──────────────────────────────────────────────────────────
  const fillPct   = isLocked ? 0 : quota.limit > 0
    ? Math.min((quota.used / quota.limit) * 100, 100)
    : 0;
  const fillColor = fillPct >= 100
    ? "rgba(245,158,11,0.12)"  // amber wash when all used
    : skill === "speaking"
      ? "rgba(200,150,62,0.10)"
      : "rgba(212,168,83,0.10)";

  // ── Tests chip label ───────────────────────────────────────────────────────
  const chipLabel = isLocked ? null : `${quota.used}/${quota.limit}`;

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
          meta.color.grad,
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
              {skill === "speaking" ? "Speaking" : "Writing"}
            </span>
            <span className={cn(BADGE_BASE, meta.color.bg, meta.color.border, meta.color.text)}>
              Mock Exam
            </span>
          </div>

          {/* Tests chip */}
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

          {/* Locked icon */}
          {isLocked && (
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Lock className="w-3.5 h-3.5 text-white/25" />
            </div>
          )}
        </div>

        {/* ── Row 2: icon + title ────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className={cn(
            "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0",
            meta.color.bg, meta.color.border,
          )}>
            <Icon className={cn("w-4 h-4", meta.color.text)} />
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-snug">{meta.label}</h3>
        </div>

        {/* ── Row 3: meta row ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 text-xs text-subtle/80 mb-3">
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

        {/* ── Row 4: description (flex-1, pushes footer down) ──────────── */}
        <p className="text-sm text-subtle leading-relaxed line-clamp-2 flex-1">{meta.description}</p>

        {/* ── Row 5: footer ─────────────────────────────────────────────── */}
        {!isLocked && (
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06]">
            <span className="text-[11px] text-white/30">
              {quota.remaining > 0
                ? `${quota.remaining} test${quota.remaining === 1 ? "" : "s"} remaining`
                : "All tests used · retries available"}
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
  return <Link href={`/practice/${skill}`} className="block h-full">{inner}</Link>;
}
