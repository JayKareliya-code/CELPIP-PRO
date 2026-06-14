// ─────────────────────────────────────────────────────────────────────────────
// ExamInfoBar.tsx — Static exam top bar
//
// PREP:      [Task 1: Giving Advice]        Preparation: 30s | Recording: 60s
// RECORDING: [Task 1: Giving Advice]  ● REC  1:20  |  Recording: 60s
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useMemo } from "react";
import { cn, formatTime } from "@/lib/utils";

interface ExamInfoBarProps {
  taskNumber:      number;
  taskTitle:       string;
  prepSeconds:     number;
  responseSeconds: number;
  isRecording?:    boolean;
  secondsLeft?:    number;
  partLabel?:      string;
  className?:      string;
}

/**
 * Returns the phrase a screen reader should announce at this exact tick.
 * Returns "" when no announcement is due — which prevents the SR from
 * re-reading every second (which would be unusable). The visible numeric
 * timer carries `aria-hidden="true"` so SRs only hear these checkpoints.
 */
function useTimerAnnouncement(isRecording: boolean, secondsLeft: number | undefined): string {
  return useMemo(() => {
    if (!isRecording || secondsLeft === undefined) return "";
    if (secondsLeft <= 0) return "Time is up.";
    // Spaced checkpoints during the bulk of the response, then a final
    // countdown for the last 5 seconds when accuracy matters most.
    if (secondsLeft === 60 || secondsLeft === 30 || secondsLeft === 15 || secondsLeft === 10) {
      return `${secondsLeft} seconds remaining.`;
    }
    if (secondsLeft <= 5) {
      return `${secondsLeft}.`;
    }
    return "";
  }, [isRecording, secondsLeft]);
}

export function ExamInfoBar({
  taskNumber,
  taskTitle,
  prepSeconds,
  responseSeconds,
  isRecording = false,
  secondsLeft,
  partLabel,
  className,
}: ExamInfoBarProps) {
  const taskLabel        = taskNumber === 0 ? "Practice" : `Task ${taskNumber}`;
  const isCritical       = isRecording && (secondsLeft ?? 0) <= 10;
  const timerAnnouncement = useTimerAnnouncement(isRecording, secondsLeft);

  return (
    <div
      className={cn(
        "sticky top-0 z-10 shrink-0 w-full",
        "bg-canvas/95 backdrop-blur-md border-b border-border/40",
        className,
      )}
    >
      {/* Main row */}
      <div className="max-w-5xl mx-auto px-6 sm:px-10 flex items-center justify-between h-14 gap-4">

        {/* Left — task identity */}
        <p className="text-sm font-semibold text-canvas-text/80 truncate">
          <span className="text-canvas-subtle mr-2">{taskLabel}:</span>
          {taskTitle}
          {partLabel && (
            <span className="ml-2 text-xs text-canvas-subtle/60 font-normal">{partLabel}</span>
          )}
        </p>

        {/* Right — phase durations */}
        <div className="flex items-center gap-3 shrink-0 text-xs text-canvas-subtle font-medium">
          {isRecording ? (
            // `role="status"` + assertive live-region announces "Rec" the
            // moment the recording starts so SR users get the same cue as the
            // pulsing red dot. The visible numeric timer is aria-hidden so SRs
            // don't read it every second; the checkpoint announcer below fires
            // at 60/30/15/10 and the final 5 seconds only.
            <div
              role="status"
              aria-live="assertive"
              aria-atomic="true"
              aria-label={
                secondsLeft !== undefined
                  ? `Recording. ${secondsLeft} seconds left.`
                  : "Recording started."
              }
              className="flex items-center gap-2.5"
            >
              {/* Pulsing REC dot */}
              <span aria-hidden="true" className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
              </span>
              <span aria-hidden="true" className="text-danger font-semibold uppercase tracking-widest text-[11px]">
                Rec
              </span>
              {secondsLeft !== undefined && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "tabular-nums font-bold text-sm",
                    isCritical ? "text-danger animate-pulse" : "text-canvas-text",
                  )}
                >
                  {formatTime(secondsLeft)}
                </span>
              )}
              <span aria-hidden="true" className="text-border">|</span>
            </div>
          ) : (
            <>
              <span>
                <span className="text-canvas-text/60 font-semibold">Prep:</span>{" "}
                {prepSeconds}s
              </span>
              <span className="text-border">|</span>
            </>
          )}
          <span>
            <span className="text-canvas-text/60 font-semibold">Recording:</span>{" "}
            {responseSeconds}s
          </span>
        </div>
      </div>

      {/* Depleting progress bar — recording only */}
      {isRecording && secondsLeft !== undefined && (
        <div
          className="h-[2px] w-full bg-border/30"
          // The bar is decorative — value is conveyed by the timer announcer
          // below. Marking aria-hidden prevents SR users from being told about
          // a sliver moving every 16ms.
          aria-hidden="true"
        >
          <div
            className={cn("h-full transition-all duration-1000 ease-linear", isCritical ? "bg-danger" : "bg-danger/50")}
            style={{ width: `${Math.min(100, (secondsLeft / responseSeconds) * 100)}%` }}
          />
        </div>
      )}

      {/*
        Throttled live-region for screen readers — announces remaining time at
        60s / 30s / 15s / 10s, then every second for the final 5. Mid-band
        ticks render as "" so the SR is silent. Switches to assertive in the
        critical zone so an in-progress utterance is interrupted.
      */}
      <span className="sr-only" aria-live={isCritical ? "assertive" : "polite"} aria-atomic="true">
        {timerAnnouncement}
      </span>
    </div>
  );
}
