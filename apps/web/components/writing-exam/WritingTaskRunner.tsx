"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingTaskRunner — Runs a single writing task inside the mock exam.
//
// Mirrors WritingPracticeSession but:
//   • Does NOT navigate away after submit — calls onComplete(attemptId)
//   • Passes is_mock_test: true to the API
//   • Exit triggers onExit() (parent confirms and handles navigation)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth }             from "@clerk/nextjs";

import { CountdownOverlay }    from "@/components/speaking/CountdownOverlay";
import { WritingSessionHeader } from "@/components/writing/WritingSessionHeader";
import { WritingPromptBox }    from "@/components/writing/WritingPromptBox";
import { WritingEditor, clearDraft } from "@/components/writing/WritingEditor";
import { WordCounter }         from "@/components/writing/WordCounter";
import { SubmitWritingButton } from "@/components/writing/SubmitWritingButton";
import { ProcessingScreen }    from "@/components/common/ProcessingScreen";
import { ConfirmModal }        from "@/components/common/ConfirmModal";
import { countWords }          from "@/lib/utils";
import { API_BASE_URL, API_V1, authHeaders } from "@/lib/api";
import {
  COUNTDOWN_STEPS,
  COUNTDOWN_STEP_DURATION_MS,
} from "@/lib/constants";
import type { WritingTask }    from "@/lib/types";

// ── Internal types ────────────────────────────────────────────────────────────

type TaskPhase = "COUNTDOWN" | "WRITING" | "SUBMITTING" | "PROCESSING";

const TOTAL_COUNTDOWN_MS = COUNTDOWN_STEPS.length * COUNTDOWN_STEP_DURATION_MS;

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingTaskRunnerProps {
  task:       WritingTask;
  /** Test slot number (1-based) — used for slot-aware mock exam quota. */
  examNumber: number;
  /** Called with the attempt UUID once the task essay is submitted. */
  onComplete: (attemptId: string) => void;
  /** Called when the user confirms they want to exit the whole exam. */
  onExit:     () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WritingTaskRunner({ task, examNumber, onComplete, onExit }: WritingTaskRunnerProps) {
  const { getToken } = useAuth();

  const [phase,      setPhase]     = useState<TaskPhase>("COUNTDOWN");
  const [secondsLeft, setSecsL]    = useState(0);
  const [wordCount,  setWordCount] = useState(0);
  const [submitError, setError]    = useState<string | null>(null);
  const [showExit,   setShowExit]  = useState(false);

  const secsRef        = useRef(0);
  const plainTextRef   = useRef("");
  const autoSubmitted  = useRef(false);
  const tickRef        = useRef<ReturnType<typeof setInterval>  | null>(null);
  const cdRef          = useRef<ReturnType<typeof setTimeout>   | null>(null);
  // Tracks the in-flight submit request so we can abort it on unmount or re-entry
  const abortRef       = useRef<AbortController | null>(null);
  const draftKey       = `mock-task-${task.id}`;

  const clearTimers = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (cdRef.current)   { clearTimeout(cdRef.current);   cdRef.current   = null; }
  }, []);

  // Full teardown: stops timers AND aborts any in-flight fetch.
  // Only call this on unmount or when abandoning a submission entirely.
  // Do NOT call this on normal phase transitions (e.g. SUBMITTING → PROCESSING)
  // or the AbortController will kill the in-flight onComplete callback.
  const clearAll = useCallback(() => {
    clearTimers();
    abortRef.current?.abort();
    abortRef.current = null;
  }, [clearTimers]);

  // ── Phase driver ───────────────────────────────────────────────────────────

  useEffect(() => {
    // Only cancel timers here — do NOT abort in-flight requests.
    // If we called clearAll() (which aborts) on every phase change, the
    // SUBMITTING → PROCESSING transition would abort the AbortController
    // just before onComplete fires, leaving the UI stuck on ProcessingScreen.
    clearTimers();

    if (phase === "COUNTDOWN") {
      cdRef.current = setTimeout(() => {
        secsRef.current = task.time_limit_seconds;
        setSecsL(task.time_limit_seconds);
        setPhase("WRITING");
      }, TOTAL_COUNTDOWN_MS);
    }

    if (phase === "WRITING") {
      tickRef.current = setInterval(() => {
        if (secsRef.current <= 1) {
          clearTimers();
          autoSubmitted.current = true;
          setPhase("SUBMITTING");
        } else {
          secsRef.current -= 1;
          setSecsL((s) => Math.max(0, s - 1));
        }
      }, 1_000);
    }

    if (phase === "SUBMITTING") { runSubmit(); }

    return clearTimers;  // cleanup: stop timers only, preserve abort signal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Full teardown on unmount — stops timers AND aborts any in-flight fetch.
  useEffect(() => clearAll, [clearAll]);

  // ── API pipeline ───────────────────────────────────────────────────────────

  async function runSubmit() {
    // Cancel any previous in-flight request and create a fresh abort signal.
    // This prevents callbacks from firing if the component unmounts mid-request.
    abortRef.current?.abort();
    const ac     = new AbortController();
    abortRef.current = ac;
    const { signal } = ac;

    try {
      const token   = await getToken();
      if (signal.aborted) return;
      const headers = { ...authHeaders(token), "Content-Type": "application/json" };

      // Step 1 — create attempt (quota check, is_mock_test = true)
      const startRes = await fetch(`${API_BASE_URL}${API_V1}/writing/attempts/start`, {
        method: "POST", headers, signal,
        body: JSON.stringify({ prompt_id: task.id, is_mock_test: true, mock_exam_number: examNumber }),
      });
      if (signal.aborted) return;
      if (!startRes.ok) {
        const err = await startRes.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? `start failed: ${startRes.status}`);
      }
      const { attempt_id } = await startRes.json() as { attempt_id: string };
      if (signal.aborted) return;

      // Step 2 — submit essay.
      // Retry up to 3 times with backoff: the OPTIONS preflight + a new DB session
      // can occasionally race against the just-committed start transaction, causing
      // a transient 404 on the first submit attempt.
      let submitRes: Response | null = null;
      const MAX_SUBMIT_RETRIES = 3;
      for (let attempt = 0; attempt < MAX_SUBMIT_RETRIES; attempt++) {
        if (signal.aborted) return;
        if (attempt > 0) {
          // Exponential backoff: 300ms, 700ms
          await new Promise((r) => setTimeout(r, 300 * (2 ** (attempt - 1))));
        }
        if (signal.aborted) return;
        // Refresh token on every retry in case it expired during a retry delay.
        const retryToken   = await getToken();
        const retryHeaders = { ...authHeaders(retryToken), "Content-Type": "application/json" };
        submitRes = await fetch(`${API_BASE_URL}${API_V1}/writing/attempts/${attempt_id}/submit`, {
          method: "POST", headers: retryHeaders, signal,
          body: JSON.stringify({
            essay_text:     plainTextRef.current,
            auto_submitted: autoSubmitted.current,
          }),
        });
        // Retry only on transient 404 — all other errors surface immediately.
        if (submitRes.status !== 404) break;
      }

      if (signal.aborted) return;
      if (!submitRes || !submitRes.ok) {
        const err = await submitRes?.json().catch(() => ({})) ?? {};
        throw new Error((err as { detail?: string }).detail ?? `submit failed: ${submitRes?.status}`);
      }

      clearDraft(draftKey);
      setPhase("PROCESSING");
      // Brief pause so PROCESSING screen is visible, then signal completion.
      // Guard against component unmount between setPhase and the timeout firing.
      if (!signal.aborted) {
        setTimeout(() => { if (!signal.aborted) onComplete(attempt_id); }, 1_200);
      }

    } catch (err) {
      // Silently ignore intentional aborts (unmount or navigation).
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (signal.aborted) return;
      // P1-1: reset autoSubmitted — the retry will be a deliberate manual action.
      autoSubmitted.current = false;
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
      secsRef.current = Math.max(secsRef.current, 30);
      setSecsL(secsRef.current);
      setPhase("WRITING");
    }
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    clearDraft(draftKey);
    clearTimers();  // stop tick; runSubmit will create a fresh AbortController
    autoSubmitted.current = false;
    setPhase("SUBMITTING");
  }, [clearTimers, draftKey]);

  const setContent = useCallback((_html: string, plainText: string) => {
    plainTextRef.current = plainText;
    setWordCount(countWords(plainText));
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === "COUNTDOWN") return <CountdownOverlay />;
  if (phase === "SUBMITTING" || phase === "PROCESSING")
    return <ProcessingScreen skill="writing" />;

  return (
    // flex-col flex-1 gives CountdownOverlay's h-full a resolved height
    <div className="flex flex-col flex-1 relative">
      <div className="flex flex-col flex-1">

        {/* Sticky header */}
        <WritingSessionHeader
          taskNumber={task.task_number}
          timeLimitSeconds={task.time_limit_seconds}
          secondsLeft={secondsLeft}
          totalTasks={2}
        />

        {/* Content */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-4">
          <WritingPromptBox promptText={task.prompt_text} className="opacity-80" />
          <WritingEditor onUpdate={setContent} editable sessionKey={draftKey} />

          {submitError && (
            <div className="rounded-lg border border-red-700/40 bg-red-950/40 px-4 py-3 flex items-start gap-3 text-sm">
              <span className="text-red-400 shrink-0 mt-0.5">⚠</span>
              <div>
                <p className="font-semibold text-red-300">Submission failed</p>
                <p className="text-red-400/80 mt-0.5">{submitError}</p>
                <p className="text-red-400/60 text-xs mt-1">
                  Your writing is preserved. Click Submit to try again.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <WordCounter count={wordCount} minWords={task.min_words} maxWords={task.max_words} />
            <SubmitWritingButton onSubmit={handleSubmit} disabled={wordCount === 0} />
          </div>
        </div>
      </div>


      <ConfirmModal
        open={showExit}
        onCancel={() => setShowExit(false)}
        onConfirm={() => { setShowExit(false); clearDraft(draftKey); clearAll(); onExit(); }}
        title="Leave this exam?"
        description="Your progress on this task will be lost. The exam cannot be resumed."
        confirmLabel="Leave exam"
        isDestructive
      />
    </div>
  );
}
