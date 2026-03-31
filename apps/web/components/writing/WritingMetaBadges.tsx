// ─────────────────────────────────────────────────────────────────────────────
// WritingMetaBadges.tsx — Time limit + word count badges for writing tasks
// ─────────────────────────────────────────────────────────────────────────────

import { Clock, AlignLeft } from "lucide-react";
import { cn }               from "@/lib/utils";
import { formatTime }       from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingMetaBadgesProps {
  timeLimitSeconds: number;
  minWords:         number;
  maxWords:         number | null;
  className?:       string;
}

// ── Shared badge shell ─────────────────────────────────────────────────────────

const BADGE_BASE =
  "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-subtle bg-surface";

/**
 * Pill badges showing time limit and word count range for a writing task.
 * Mirrors the design of TaskMetaBadges from the speaking module.
 */
export function WritingMetaBadges({
  timeLimitSeconds,
  minWords,
  maxWords,
  className,
}: WritingMetaBadgesProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {/* Time limit */}
      <span className={BADGE_BASE}>
        <Clock className="w-3.5 h-3.5 text-primary" />
        {formatTime(timeLimitSeconds)} time limit
      </span>

      {/* Word count range */}
      <span className={BADGE_BASE}>
        <AlignLeft className="w-3.5 h-3.5 text-primary" />
        {maxWords != null ? `${minWords}–${maxWords} words` : `${minWords}+ words`}
      </span>
    </div>
  );
}
