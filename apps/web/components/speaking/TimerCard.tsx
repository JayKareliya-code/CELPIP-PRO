// ─────────────────────────────────────────────────────────────────────────────
// TimerCard.tsx — Compact countdown card shown during PREP phase
//
// Design: neutral card (no colored background) with amber accent on the
// label and timer text — consistent with the site's card/surface system.
//
//   ┌────────────────────────────────────────────────┐
//   │  Preparation Time                        0:29  │
//   │  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
//   └────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo }    from "react";
import { TimerBar }   from "@/components/common/TimerBar";
import { formatTime } from "@/lib/utils";
import { cn }         from "@/lib/utils";

/** Throttle SR announcements to checkpoints + final 5s. See ExamInfoBar. */
function prepAnnouncement(secondsLeft: number): string {
  if (secondsLeft <= 0)                          return "Preparation time is up.";
  if ([30, 15, 10].includes(secondsLeft))        return `${secondsLeft} seconds of preparation remaining.`;
  if (secondsLeft <= 5)                          return `${secondsLeft}.`;
  return "";
}

interface TimerCardProps {
  secondsLeft:  number;
  totalSeconds: number;
  label?:       string;
  className?:   string;
}

export function TimerCard({
  secondsLeft,
  totalSeconds,
  label = "Preparation Time",
  className,
}: TimerCardProps) {
  const isCritical = secondsLeft <= 10;
  const srPhrase   = useMemo(() => prepAnnouncement(secondsLeft), [secondsLeft]);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-surface/40 px-5 py-4 flex flex-col gap-3",
        className,
      )}
    >
      {/* Label row + countdown — the visible numeric counter is decorative
          for SRs; the live region below carries the throttled announcement. */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold tracking-[0.12em] uppercase text-canvas-subtle/70 select-none">
          {label}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "tabular-nums font-bold text-2xl leading-none",
            isCritical ? "text-danger animate-pulse" : "text-primary",
          )}
        >
          {formatTime(secondsLeft)}
        </span>
      </div>

      {/* Depleting bar */}
      <TimerBar
        secondsLeft={secondsLeft}
        totalSeconds={totalSeconds}
        trackHeight="h-1"
      />

      {/* SR-only countdown — quiet during mid-band, assertive at the end. */}
      <span className="sr-only" aria-live={isCritical ? "assertive" : "polite"} aria-atomic="true">
        {srPhrase}
      </span>
    </div>
  );
}
