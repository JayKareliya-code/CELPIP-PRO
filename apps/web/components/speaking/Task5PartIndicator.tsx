// ─────────────────────────────────────────────────────────────────────────────
// Task5PartIndicator.tsx — Part 1 / Part 2 switcher for Task 5
//
// Task 5 "Comparing and Persuading" has two consecutive response parts.
// This component makes the current part crystal-clear to the user.
// It is ONLY rendered when task.has_parts === true.
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Task5PartIndicatorProps {
  /** Which part is currently active (1-indexed). */
  currentPart: 1 | 2;
  /** Total number of parts (always 2 for Task 5). */
  totalParts?: number;
  className?: string;
}

/**
 * Pill-based part indicator for Task 5.
 *
 * Shows two pills (Part 1 / Part 2) with the active one highlighted.
 * Purely presentational — parent derives `currentPart` from session phase.
 */
export function Task5PartIndicator({
  currentPart,
  totalParts = 2,
  className,
}: Task5PartIndicatorProps) {
  return (
    <div
      className={cn("flex flex-col items-center gap-3", className)}
      aria-label={`Part ${currentPart} of ${totalParts}`}
    >
      {/* Pill strip */}
      <div className="flex gap-2">
        {Array.from({ length: totalParts }, (_, i) => {
          const part      = i + 1;
          const isActive  = part === currentPart;
          const isComplete = part < currentPart;

          return (
            <div
              key={part}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border",
                isActive
                  ? "bg-primary/20 text-primary border-primary/50 scale-105"
                  : isComplete
                    ? "bg-success/10 text-success border-success/30"
                    : "bg-white/5 text-canvas-subtle border-white/10"
              )}
            >
              {isComplete && (
                <span aria-hidden="true">✓</span>
              )}
              Part {part}
            </div>
          );
        })}
      </div>

      {/* Contextual description */}
      <p className="text-xs text-canvas-subtle text-center max-w-xs">
        {currentPart === 1
          ? "Compare the two options and state your preference."
          : "Now persuade your friend to choose the other option."}
      </p>
    </div>
  );
}
