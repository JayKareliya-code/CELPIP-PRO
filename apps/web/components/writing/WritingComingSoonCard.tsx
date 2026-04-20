// ─────────────────────────────────────────────────────────────────────────────
// WritingComingSoonCard.tsx — Ghost placeholder card shown in the prompt grid
// when a second prompt slot is not yet available.
// ─────────────────────────────────────────────────────────────────────────────

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const BADGE_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none select-none";

export function WritingComingSoonCard() {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.08] bg-surface/50 overflow-hidden opacity-50">
      {/* Header skeleton */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className={cn(BADGE_BASE, "bg-white/[0.04] text-white/20 border-white/[0.06]")}>
            Coming soon
          </span>
        </div>
      </div>

      {/* Body lines */}
      <div className="px-4 py-4 space-y-2">
        <div className="h-3 bg-white/[0.04] rounded w-full" />
        <div className="h-3 bg-white/[0.04] rounded w-5/6" />
        <div className="h-3 bg-white/[0.04] rounded w-2/3" />
      </div>

      {/* CTA placeholder */}
      <div className="px-4 pb-4 pt-1">
        <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-semibold text-white/20">
          <Sparkles className="w-4 h-4" />
          New Prompt — Coming Soon
        </div>
      </div>
    </div>
  );
}
