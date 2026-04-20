// ─────────────────────────────────────────────────────────────────────────────
// WritingPromptCtaButton.tsx — Three-state CTA inside a writing prompt card.
//
// States (in priority order):
//   isAlreadyAttempted && !isBonusRetry → "Redo"   (green)
//   isBonusRetry                        → "Practice Again (Free Retry)"  (amber)
//   default                             → "Start Writing"  (emerald)
// ─────────────────────────────────────────────────────────────────────────────

import { PlayCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface WritingPromptCtaButtonProps {
  isAlreadyAttempted: boolean;
  isBonusRetry: boolean;
}

export function WritingPromptCtaButton({
  isAlreadyAttempted,
  isBonusRetry,
}: WritingPromptCtaButtonProps) {
  const base =
    "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150";

  if (isAlreadyAttempted && !isBonusRetry) {
    return (
      <div className={cn(
        base,
        "bg-emerald-700/60 group-hover:bg-emerald-700/80",
        "text-emerald-100 border border-emerald-600/40 group-hover:border-emerald-500/60",
      )}>
        <RotateCcw className="w-4 h-4" />
        Redo
      </div>
    );
  }

  if (isBonusRetry) {
    return (
      <div className={cn(
        base,
        "bg-amber-700/60 group-hover:bg-amber-700/80",
        "text-amber-100 border border-amber-600/40 group-hover:border-amber-500/60",
      )}>
        <RotateCcw className="w-4 h-4" />
        Practice Again (Free Retry)
      </div>
    );
  }

  return (
    <div className={cn(
      base,
      "bg-emerald-600/70 group-hover:bg-emerald-600/90",
      "text-emerald-100 border border-emerald-500/40 group-hover:border-emerald-400/60",
    )}>
      <PlayCircle className="w-4 h-4" />
      Start Writing
    </div>
  );
}
