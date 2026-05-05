// ─────────────────────────────────────────────────────────────────────────────
// WordCounter.tsx — Live word count displayed during the writing session
//
// Colour logic:
//   Grey   — below minimum word count
//   Green  — within the target range (min ≤ count ≤ max, or ≥ min when no max)
//   Amber  — above the max (overwriting), only when maxWords is set
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WordCounterProps {
  /** Current word count from the editor. */
  count:      number;
  /** Minimum required words for this task. */
  minWords:   number;
  /**
   * Maximum recommended words for this task.
   * null means no upper limit (e.g. Writing Task 2 opinion essay).
   */
  maxWords:   number | null;
  /** Optional additional className for the wrapper. */
  className?: string;
}

// ── Colour resolver ───────────────────────────────────────────────────────────

function counterColour(count: number, min: number, max: number | null): string {
  if (max !== null && count > max) return "text-warning font-semibold";
  if (count >= min) return "text-success font-semibold";
  return "text-subtle";
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Compact word counter shown in the writing session header bar.
 * Signals when the user has hit (green) or exceeded (amber) the target range.
 * When maxWords is null, no upper limit is shown — only a minimum target.
 */
export function WordCounter({ count, minWords, maxWords, className }: WordCounterProps) {
  const isOver  = maxWords !== null && count > maxWords;
  const isReady = count >= minWords && (maxWords === null || count <= maxWords);

  // Aria label adapts to whether there's a maximum
  const ariaLabel = maxWords !== null
    ? `Word count: ${count}. Target: ${minWords} to ${maxWords} words.`
    : `Word count: ${count}. Minimum: ${minWords} words.`;

  return (
    <div
      className={cn("flex items-baseline gap-1 text-sm tabular-nums", className)}
      aria-live="polite"
      aria-atomic="true"
      aria-label={ariaLabel}
    >
      {/* Live count */}
      <span className={cn("text-base", counterColour(count, minWords, maxWords))}>
        {count}
      </span>

      {/* Range label */}
      <span className="text-subtle">
        {isOver
          ? `/ max ${maxWords}`
          : isReady
          ? maxWords !== null
            ? <><span aria-hidden="true">/ {maxWords} max </span><span aria-hidden="true">✓</span></>
            : <><span aria-hidden="true">words </span><span aria-hidden="true">✓</span></>
          : `/ min ${minWords}`}
      </span>

      {/* Over-limit warning */}
      {isOver && (
        <span className="text-warning text-xs font-medium">(over limit)</span>
      )}
    </div>
  );
}
