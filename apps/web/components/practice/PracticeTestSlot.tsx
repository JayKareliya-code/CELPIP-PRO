// ─────────────────────────────────────────────────────────────────────────────
// PracticeTestSlot — One row in the /practice/[skill] list.
//
// States:
//   available → clickable, shows PlayCircle
//   used      → dimmer, shows Redo label + PlayCircle
//   locked    → greyed out, shows Lock icon, not clickable
// ─────────────────────────────────────────────────────────────────────────────

import Link          from "next/link";
import {
  Lock, PlayCircle, CheckCircle2, Clock,
} from "lucide-react";
import { cn }        from "@/lib/utils";
import { SKILL_META } from "@/lib/practice/config";
import type { PracticeTestSlotData } from "@/lib/practice/types";
import type { Skill }                from "@/lib/types";

interface PracticeTestSlotProps {
  slot:  PracticeTestSlotData;
  skill: Skill;
  /**
   * href to navigate to on click. Pass undefined while the backend endpoint
   * is not yet wired — slot will still render but won't be wrapped in a Link.
   */
  href?: string;
}

export function PracticeTestSlot({ slot, skill, href }: PracticeTestSlotProps) {
  const { slotNumber, isUsed, isLocked, estimatedBand } = slot;
  const meta  = SKILL_META[skill];
  const Icon  = meta.icon;
  const label = `Full Practice ${slotNumber}`;

  const card = (
    <div
      className={cn(
        "group relative rounded-xl border bg-surface overflow-hidden",
        "flex items-center gap-4 px-5 py-4 transition-all duration-200",
        isLocked
          ? "border-white/[0.05] opacity-50 cursor-not-allowed"
          : isUsed
            ? "border-white/[0.08] cursor-pointer hover:border-white/[0.15]"
            : "border-white/[0.08] cursor-pointer hover:border-white/[0.18] hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
      )}
    >
      {/* Slot number badge */}
      <div
        className={cn(
          "w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 text-lg font-bold",
          isLocked
            ? "bg-white/[0.03] border-white/[0.07] text-white/20"
            : cn(meta.color.bg, meta.color.border, meta.color.text),
        )}
      >
        {isLocked ? <Lock className="w-4 h-4" /> : slotNumber}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{label}</span>

          {isUsed && !isLocked && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              {estimatedBand != null ? `Band ${estimatedBand}` : "Completed"}
            </span>
          )}

          {isLocked && (
            <span className="text-xs text-white/25">Upgrade to unlock</span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-subtle/70">
          <span className="flex items-center gap-1">
            <Icon className="w-3 h-3" />
            {meta.taskSummary}
          </span>
          <span className="w-px h-3 bg-white/10" />
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {meta.duration}
          </span>
        </div>
      </div>

      {/* Right action */}
      <div className="shrink-0">
        {isLocked ? (
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-white/20" />
          </div>
        ) : isUsed ? (
          <div className="flex items-center gap-2 text-xs text-subtle">
            <span>Redo</span>
            <PlayCircle className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
          </div>
        ) : (
          <PlayCircle className="w-5 h-5 text-white/30 group-hover:text-white/70 transition-colors" />
        )}
      </div>
    </div>
  );

  // No href while backend isn't ready — renders as a non-interactive card
  if (isLocked || !href) return card;

  return <Link href={href} className="contents">{card}</Link>;
}
