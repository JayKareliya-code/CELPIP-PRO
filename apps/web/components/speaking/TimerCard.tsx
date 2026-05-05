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

import { TimerBar }   from "@/components/common/TimerBar";
import { formatTime } from "@/lib/utils";
import { cn }         from "@/lib/utils";

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

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-surface/40 px-5 py-4 flex flex-col gap-3",
        className,
      )}
    >
      {/* Label row + countdown */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold tracking-[0.12em] uppercase text-canvas-subtle/70 select-none">
          {label}
        </span>
        <span className={cn(
          "tabular-nums font-bold text-2xl leading-none",
          isCritical ? "text-danger animate-pulse" : "text-primary",
        )}>
          {formatTime(secondsLeft)}
        </span>
      </div>

      {/* Depleting bar */}
      <TimerBar
        secondsLeft={secondsLeft}
        totalSeconds={totalSeconds}
        trackHeight="h-1"
      />
    </div>
  );
}
