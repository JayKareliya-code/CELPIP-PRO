// ─────────────────────────────────────────────────────────────────────────────
// PracticeSkillCard — Large card on /practice hub for one skill.
//
// Progress design: full-card translucent background fill (same system as
// SpeakingTaskCard and PracticeTestSlot). Ring and progress bar removed.
//
// Displays:
//   • Skill icon (top-left) + used/limit chip (top-right)
//   • Title + description
//   • CTA footer with remaining count or locked state
// ─────────────────────────────────────────────────────────────────────────────

import Link           from "next/link";
import { Lock, ChevronRight } from "lucide-react";
import { cn }                from "@/lib/utils";
import { SKILL_META }         from "@/lib/practice/config";
import type { PracticeQuota } from "@/lib/practice/types";
import type { Skill }          from "@/lib/types";

interface PracticeSkillCardProps {
  skill:      Skill;
  quota:      PracticeQuota;
  planLabel:  string;
  /** When true the card renders in a locked/dimmed state. */
  isLocked?:  boolean;
}

// Convert a hex colour to an rgba() string with the given opacity
function hexFill(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function PracticeSkillCard({
  skill,
  quota,
  planLabel,
  isLocked = false,
}: PracticeSkillCardProps) {
  const meta      = SKILL_META[skill];
  const Icon      = meta.icon;
  const { color } = meta;

  // ── Fill percentage ───────────────────────────────────────────────────────
  const fillPct   = quota.limit > 0 ? Math.min((quota.used / quota.limit) * 100, 100) : 0;
  const fillColor = isLocked ? "rgba(255,255,255,0.04)" : hexFill(color.ring, 0.10);

  // ── Chip label ────────────────────────────────────────────────────────────
  const chipLabel = isLocked
    ? null
    : `${quota.used}/${quota.limit}`;

  const inner = (
    <div
      className={cn(
        "group relative rounded-2xl border border-white/[0.08] bg-surface overflow-hidden",
        "flex flex-col transition-all duration-200",
        isLocked
          ? "opacity-60 cursor-not-allowed"
          : "hover:border-white/[0.2] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] cursor-pointer",
      )}
    >
      {/* ── Layer 0: gradient accent splash (top) ─────────────────────────── */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-32 bg-gradient-to-b opacity-80 pointer-events-none",
          color.grad,
        )}
      />

      {/* ── Layer 1: full-card background fill (progress) ─────────────────── */}
      {fillPct > 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 pointer-events-none transition-all duration-700 ease-out"
          style={{ width: `${fillPct}%`, background: fillColor }}
        />
      )}

      {/* ── Layer 2: card content ─────────────────────────────────────────── */}

      {/* Top row: icon + usage chip */}
      <div className="relative flex items-start justify-between gap-4 px-6 pt-6 pb-0">
        <div className={cn(
          "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0",
          color.bg, color.border, color.text,
        )}>
          <Icon className="w-6 h-6" />
        </div>

        {/* Usage chip (replaces the quota ring) */}
        {chipLabel && (
          <span className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1",
            "text-xs font-semibold tabular-nums select-none",
            fillPct >= 100
              ? "bg-white/[0.07] border-white/[0.12] text-white/50"
              : "bg-white/[0.05] border-white/[0.09] text-white/40",
          )}>
            {chipLabel}
          </span>
        )}

        {isLocked && (
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-white/25" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="relative px-6 pt-4 pb-6 flex flex-col gap-3 flex-1">
        <div>
          <h2 className="text-xl font-bold text-foreground">{meta.label}</h2>
          <p className="text-sm text-subtle mt-1 leading-relaxed">{meta.description}</p>
        </div>

        {/* Usage label row */}
        <div className="flex items-center justify-between text-xs text-subtle">
          <span>
            {isLocked ? "Upgrade to access" : `${quota.used} of ${quota.limit} used`}
          </span>
          <span className="font-medium text-foreground/60">{planLabel}</span>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/[0.06]">
          {isLocked ? (
            <span className="flex items-center gap-1.5 text-sm text-white/30 font-medium">
              <Lock className="w-3.5 h-3.5" />
              Requires paid plan
            </span>
          ) : (
            <span className="text-sm font-semibold text-foreground">
              {quota.remaining > 0
                ? `${quota.remaining} test${quota.remaining === 1 ? "" : "s"} remaining`
                : "All tests used"}
            </span>
          )}
          <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/70 transition-colors" />
        </div>
      </div>

      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="px-4 py-2 rounded-full bg-black/40 border border-white/10 text-xs text-white/40 font-medium backdrop-blur-sm flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Upgrade to unlock
          </div>
        </div>
      )}
    </div>
  );

  if (isLocked) return inner;
  return <Link href={`/practice/${skill}`} className="block h-full">{inner}</Link>;
}
