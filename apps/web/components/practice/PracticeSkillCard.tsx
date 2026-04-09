// ─────────────────────────────────────────────────────────────────────────────
// PracticeSkillCard — Large card on /practice hub for one skill.
//
// Displays:
//   • Skill icon + circular quota ring
//   • Title + description
//   • Horizontal quota bar
//   • CTA footer with remaining count or locked state
// ─────────────────────────────────────────────────────────────────────────────

import Link     from "next/link";
import { Lock, ChevronRight } from "lucide-react";
import { cn }               from "@/lib/utils";
import { SKILL_META }        from "@/lib/practice/config";
import { PracticeQuotaRing } from "@/components/practice/PracticeQuotaRing";
import type { PracticeQuota } from "@/lib/practice/types";
import type { Skill }         from "@/lib/types";

interface PracticeSkillCardProps {
  skill:      Skill;
  quota:      PracticeQuota;
  planLabel:  string;
  /** When true the card renders in a locked/dimmed state. */
  isLocked?:  boolean;
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

  const pct = quota.limit > 0 ? Math.min(quota.used / quota.limit, 1) : 0;

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
      {/* Gradient accent splash */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-32 bg-gradient-to-b opacity-80 pointer-events-none",
          color.grad,
        )}
      />

      {/* Top row: icon + ring */}
      <div className="relative flex items-start justify-between gap-4 px-6 pt-6 pb-0">
        <div className={cn("w-12 h-12 rounded-xl border flex items-center justify-center shrink-0", color.bg, color.border, color.text)}>
          <Icon className="w-6 h-6" />
        </div>
        <PracticeQuotaRing
          remaining={quota.remaining}
          limit={quota.limit}
          color={color.ring}
          size={72}
          isLocked={isLocked}
        />
      </div>

      {/* Body */}
      <div className="relative px-6 pt-4 pb-6 flex flex-col gap-3 flex-1">
        <div>
          <h2 className="text-xl font-bold text-foreground">{meta.label}</h2>
          <p className="text-sm text-subtle mt-1 leading-relaxed">{meta.description}</p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-subtle">
            <span>
              {isLocked ? "Upgrade to access" : `${quota.used} of ${quota.limit} used`}
            </span>
            <span className="font-medium text-foreground/60">{planLabel}</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width:           `${pct * 100}%`,
                backgroundColor: isLocked ? "rgba(255,255,255,0.1)" : color.ring,
              }}
            />
          </div>
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
  return <Link href={`/practice/${skill}`} className="contents">{inner}</Link>;
}
