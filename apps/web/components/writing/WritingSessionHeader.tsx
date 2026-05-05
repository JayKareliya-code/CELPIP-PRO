// ─────────────────────────────────────────────────────────────────────────────
// WritingSessionHeader.tsx — Sticky header for writing practice & mock exam
//
// Matches the speaking TaskIdentityStrip / MockExamInfoBar visual language:
//   - Depleting colour-coded timer bar at the very top
//   - Amber micro-label: "TASK 1" + dot progress (mock exam only)
//   - Bold xl/2xl heading: canonical task type name (NOT the prompt text)
//   - Time-limit pill + live countdown clock
//
// Task title is resolved from the canonical WRITING_TASK_TITLES map so the
// header always shows "Email Writing" / "Opinion Essay" regardless of what
// the DB stored in the `title` column.
//
// Used by:
//   WritingPracticeSession  (individual practice — no dots)
//   WritingTaskRunner       (mock exam — shows 2 dots)
// ─────────────────────────────────────────────────────────────────────────────

import { WritingTimerBar } from "@/components/writing/WritingTimerBar";
import { TimerDisplay }    from "@/components/common/TimerDisplay";
import { cn }              from "@/lib/utils";

// ── Canonical writing task names ─────────────────────────────────────────────
// These are the official CELPIP task type labels shown in the header.
// Never use the DB `title` column here — it stores the prompt scenario text.

const WRITING_TASK_TITLES: Record<number, string> = {
  1: "Email Writing",
  2: "Opinion Essay",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingSessionHeaderProps {
  taskNumber:       number;
  timeLimitSeconds: number;
  secondsLeft:      number;
  totalTasks?:      number;
  className?:       string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WritingSessionHeader({
  taskNumber,
  timeLimitSeconds,
  secondsLeft,
  totalTasks = 1,
  className,
}: WritingSessionHeaderProps) {
  const taskLabel    = `Task ${taskNumber}`;
  const taskTitle    = WRITING_TASK_TITLES[taskNumber] ?? `Writing Task ${taskNumber}`;
  const isCritical   = secondsLeft <= 120;           // last 2 min = red pulse
  const showDots     = totalTasks > 1;

  return (
    <div className={cn(
      "sticky top-0 z-30 shrink-0 w-full",
      "bg-canvas/95 backdrop-blur-md border-b border-border/40",
      className,
    )}>
      {/* Colour-coded depleting bar — full width at very top */}
      <WritingTimerBar secondsLeft={secondsLeft} totalSeconds={timeLimitSeconds} />

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6 sm:px-10 pt-3 pb-4">

        {/* Single row: [dots] TASK N · Title ··············· [clock] */}
        <div className="flex items-center justify-between gap-4">

          {/* Left cluster: dot progress (mock only) + task label + title */}
          <div className="flex items-center gap-3 min-w-0">

            {/* Dot progress — mock exam only, sits to the left of the label */}
            {showDots && (
              <div className="flex items-center gap-1.5 shrink-0">
                {Array.from({ length: totalTasks }, (_, i) => {
                  const dotNum   = i + 1;
                  const isActive = dotNum === taskNumber;
                  const isDone   = dotNum < taskNumber;
                  return (
                    <div
                      key={dotNum}
                      title={`Task ${dotNum} — ${WRITING_TASK_TITLES[dotNum] ?? ""}`}
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full border-2",
                        "text-xs font-bold transition-all duration-300 select-none shrink-0",
                        isDone
                          ? "bg-success/15 border-success/50 text-success"
                          : isActive
                          ? "bg-primary/20 border-primary/70 text-primary scale-110 shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]"
                          : "bg-white/[0.04] border-border/30 text-canvas-subtle/50",
                      )}
                    >
                      {dotNum}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Task label + title inline */}
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-primary/70 select-none shrink-0">
                {taskLabel}
              </span>
              <span className="text-primary/40 select-none shrink-0">·</span>
              <h2 className="text-base sm:text-lg font-bold text-canvas-text leading-tight truncate">
                {taskTitle}
              </h2>
            </div>
          </div>

          {/* Right: live countdown clock only (time-limit pill removed) */}
          <div className={cn(
            "px-3 py-1 rounded-lg border tabular-nums font-bold text-sm shrink-0",
            isCritical
              ? "bg-danger/10 border-danger/30 text-danger animate-pulse"
              : "bg-white/[0.06] border-white/[0.08] text-canvas-text",
          )}>
            <TimerDisplay
              secondsLeft={secondsLeft}
              variant="dark"
              size="md"
              pulseWhenCritical={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
