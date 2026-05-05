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

import { useEffect } from "react";

import { useWritingAttempt } from "@/lib/hooks/useWritingAttempt";
import { CountdownOverlay }         from "@/components/speaking/CountdownOverlay";
import { WritingSessionHeader }     from "@/components/writing/WritingSessionHeader";
import { WritingPromptBox }         from "@/components/writing/WritingPromptBox";
import { WritingEditor, clearDraft } from "@/components/writing/WritingEditor";
import { WordCounter }              from "@/components/writing/WordCounter";
import { SubmitWritingButton }      from "@/components/writing/SubmitWritingButton";
import { ProcessingScreen }         from "@/components/common/ProcessingScreen";
import type { WritingTask }         from "@/lib/types";

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
    terminate,
  } = useWritingAttempt();

  // Draft session key — unique per task so each task has its own draft
  const draftKey = `task-${task.id}`;

  // Start session on mount; terminate cleanly when the component unmounts
  // (covers browser back, Next.js navigation, or any parent re-key).
  // Using a single effect pairs start/terminate in the same lifecycle slot,
  // which is safe under React Strict Mode’s double-invoke.
  useEffect(() => {
    start(task);
    return () => { terminate(); };
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
          <div className="flex flex-col flex-1">

            {/* ── Sticky header ─────────────────────────────────────────── */}
            <WritingSessionHeader
              taskNumber={task.task_number}
              timeLimitSeconds={task.time_limit_seconds}
              secondsLeft={secondsLeft}
            />

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
    // flex-col flex-1 gives CountdownOverlay's h-full a resolved height
    // from the fixed-canvas layout (layout.tsx provides the true viewport size).
    <div className="flex flex-col flex-1">
      {renderScreen()}
    </div>
  );
}
