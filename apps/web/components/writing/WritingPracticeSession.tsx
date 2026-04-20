// ─────────────────────────────────────────────────────────────────────────────
// WritingPracticeSession.tsx — Top-level writing session shell
//
// Layout (WRITING phase):
//   ┌──────────────────────────────────────────────┐
//   │  [Timer bar — green/amber/red]               │  ← sticky top
//   │  Task N — Title            | MM:SS           │
//   └──────────────────────────────────────────────┘
//   [Prompt box]
//   [Writing editor — full height, spell check]
//   [  X words written          [Submit] ]          ← below editor
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import { XCircle }             from "lucide-react";

import { useWritingAttempt, clearSession } from "@/lib/hooks/useWritingAttempt";
import { CountdownOverlay }       from "@/components/speaking/CountdownOverlay";
import { WritingTimerBar }        from "@/components/writing/WritingTimerBar";
import { WritingPromptBox }       from "@/components/writing/WritingPromptBox";
import { WritingEditor, clearDraft } from "@/components/writing/WritingEditor";
import { WordCounter }            from "@/components/writing/WordCounter";
import { SubmitWritingButton }    from "@/components/writing/SubmitWritingButton";
import { TimerDisplay }           from "@/components/common/TimerDisplay";
import { ProcessingScreen }       from "@/components/common/ProcessingScreen";
import { ConfirmModal }           from "@/components/common/ConfirmModal";
import type { WritingTask }       from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingPracticeSessionProps {
  task: WritingTask;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WritingPracticeSession({ task }: WritingPracticeSessionProps) {
  const {
    phase,
    secondsLeft,
    wordCount,
    submitError,
    start,
    setContent,
    submit,
    exit,
  } = useWritingAttempt();

  const [showExitModal, setShowExitModal] = useState(false);

  // Draft session key — unique per task so each task has its own draft
  const draftKey = `task-${task.id}`;

  // Auto-start once on mount
  useEffect(() => {
    start(task);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSubmitting = phase === "SUBMITTING" || phase === "PROCESSING";
  const canExit      = !isSubmitting && phase !== "DONE";

  // Clear draft on submit so a fresh session starts next time
  const handleSubmit = () => {
    clearDraft(draftKey);
    submit();
  };

  // ── Screen renderer ────────────────────────────────────────────────────────

  const renderScreen = () => {
    switch (phase) {

      case "COUNTDOWN":
        return <CountdownOverlay />;

      case "WRITING":
        return (
          <div className="flex flex-col min-h-screen bg-surface">

            {/* ── Sticky header ─────────────────────────────────────────── */}
            <div className="sticky top-0 z-30 bg-surface border-b border-border shadow-sm">
              {/* Colour-coded timer bar */}
              <WritingTimerBar
                secondsLeft={secondsLeft}
                totalSeconds={task.time_limit_seconds}
              />
              {/* Title + clock */}
              <div className="flex items-center justify-between gap-4 px-4 py-3
                              max-w-4xl mx-auto w-full">
                <span className="text-sm font-medium text-subtle hidden sm:block truncate">
                  Task {task.task_number} — {task.title}
                </span>
                <div className="ml-auto">
                  <TimerDisplay
                    secondsLeft={secondsLeft}
                    variant="light"
                    size="md"
                    pulseWhenCritical
                  />
                </div>
              </div>
            </div>

            {/* ── Main content ─────────────────────────────────────────── */}
            <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-4">

              {/* Task prompt (read-only reminder) */}
              <WritingPromptBox
                promptText={task.prompt_text}
                className="opacity-80"
              />

              {/* Writing area */}
              <WritingEditor
                onUpdate={setContent}
                editable
                sessionKey={draftKey}
              />

              {/* ── Submit error banner ────────────────────────────────── */}
              {submitError && (
                <div className="rounded-lg border border-red-700/40 bg-red-950/40 px-4 py-3
                                flex items-start gap-3 text-sm">
                  <span className="text-red-400 shrink-0 mt-0.5">⚠</span>
                  <div>
                    <p className="font-semibold text-red-300">Submission failed</p>
                    <p className="text-red-400/80 mt-0.5">{submitError}</p>
                    <p className="text-red-400/60 text-xs mt-1">Your writing is preserved. Click Submit to try again.</p>
                  </div>
                </div>
              )}

              {/* ── Below-editor row: word count + submit ──────────────── */}
              <div className="flex items-center justify-between pt-1">
                {/* Colour-coded word counter with min/max bounds */}
                <WordCounter
                  count={wordCount}
                  minWords={task.min_words}
                  maxWords={task.max_words}
                />

                {/* Submit button */}
                <SubmitWritingButton
                  onSubmit={handleSubmit}
                  disabled={wordCount === 0}
                  isSubmitting={false}
                />
              </div>
            </div>
          </div>
        );

      case "SUBMITTING":
      case "PROCESSING":
        return <ProcessingScreen skill="writing" />;

      default:
        return (
          <div className="flex items-center justify-center min-h-screen bg-canvas">
            <span className="text-subtle opacity-50">Loading…</span>
          </div>
        );
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {renderScreen()}

      {/* Exit button — fixed top-right */}
      {canExit && phase !== "COUNTDOWN" && (
        <button
          id="exit-writing-session-btn"
          onClick={() => setShowExitModal(true)}
          className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-2
                     rounded-lg bg-muted hover:bg-border border border-border
                     text-subtle hover:text-foreground text-sm font-medium
                     transition-all duration-150"
          aria-label="Exit writing session"
        >
          <XCircle className="w-4 h-4" />
          Exit
        </button>
      )}

      {/* Confirm exit */}
      <ConfirmModal
        open={showExitModal}
        onCancel={() => setShowExitModal(false)}
        onConfirm={() => {
          setShowExitModal(false);
          clearDraft(draftKey);
          clearSession(`task-${task.id}`);
          exit();
        }}
        title="Leave this session?"
        description="Your written response will not be saved. This action cannot be undone."
        confirmLabel="Leave session"
        isDestructive
      />
    </div>
  );
}
