// ─────────────────────────────────────────────────────────────────────────────
// useWritingAttempt.ts — Writing session orchestration hook
//
// Phase machine:
//   IDLE → COUNTDOWN → WRITING → SUBMITTING → PROCESSING → DONE
//   (on resume) IDLE → WRITING (skips COUNTDOWN)
//
// API pipeline (SUBMITTING phase):
//   1. POST /writing/attempts/start        → { attempt_id }
//   2. POST /writing/attempts/{id}/submit  → sends essay_text + auto_submitted
//   3. Navigate to /attempts/{id}/status   (real-time polling page)
//
// Session persistence across page refreshes:
//   Start time + total seconds saved to sessionStorage so the timer can resume
//   if the user refreshes mid-session without losing elapsed time.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter }   from "next/navigation";
import { useAuth }     from "@clerk/nextjs";
import { countWords }  from "@/lib/utils";
import { API_V1, USE_MOCK, authHeaders } from "@/lib/api";
import {
  COUNTDOWN_STEPS,
  COUNTDOWN_STEP_DURATION_MS,
  ATTEMPT_POLL_INTERVAL_MS,
} from "@/lib/constants";
import type { WritingTask } from "@/lib/types";

// ── Phase type ────────────────────────────────────────────────────────────────

export type WritingPhase =
  | "IDLE"
  | "COUNTDOWN"
  | "WRITING"
  | "SUBMITTING"
  | "PROCESSING"
  | "DONE";

// ── Public interface ──────────────────────────────────────────────────────────

export interface UseWritingAttemptReturn {
  phase:        WritingPhase;
  secondsLeft:  number;
  wordCount:    number;
  submitError:  string | null;
  /** Start (or resume) a session for the given task. Call once on mount. */
  start: (task: WritingTask) => void;
  /** Called by WritingEditor on every keystroke with the latest content. */
  setContent: (html: string, plainText: string) => void;
  /** Manual submit — transitions WRITING → SUBMITTING. */
  submit: () => void;
  /** Exit: resets state and navigates back. Caller must confirm first. */
  exit: () => void;
}

// ── Session persistence helpers ───────────────────────────────────────────────

const SESSION_KEY_PREFIX = "celpip-timer-";

interface PersistedSession {
  /** Unix ms timestamp when WRITING phase began. */
  startedAt:    number;
  /** Total allowed seconds for this task. */
  totalSeconds: number;
}

function saveSession(taskId: string, totalSeconds: number): void {
  try {
    const payload: PersistedSession = { startedAt: Date.now(), totalSeconds };
    sessionStorage.setItem(SESSION_KEY_PREFIX + taskId, JSON.stringify(payload));
  } catch { /* storage quota or SSR */ }
}

function loadSession(taskId: string): PersistedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_PREFIX + taskId);
    return raw ? (JSON.parse(raw) as PersistedSession) : null;
  } catch { return null; }
}

export function clearSession(taskId: string): void {
  try { sessionStorage.removeItem(SESSION_KEY_PREFIX + taskId); } catch { /* noop */ }
}

// ── Internal constants ─────────────────────────────────────────────────────────

const TICK_MS            = 1_000;
const TOTAL_COUNTDOWN_MS = COUNTDOWN_STEPS.length * COUNTDOWN_STEP_DURATION_MS;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWritingAttempt(): UseWritingAttemptReturn {
  const router       = useRouter();
  const { getToken } = useAuth();

  const [phase,       setPhase]       = useState<WritingPhase>("IDLE");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [wordCount,   setWordCount]   = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Refs — stable across re-renders, safe inside interval callbacks
  const taskRef        = useRef<WritingTask | null>(null);
  const secsRef        = useRef(0);
  const plainTextRef   = useRef("");          // latest essay plain text
  const autoSubmitted  = useRef(false);       // was time-expired when submitted?
  const tickRef        = useRef<ReturnType<typeof setInterval>  | null>(null);
  const countdownRef   = useRef<ReturnType<typeof setTimeout>   | null>(null);
  const processingRef  = useRef<ReturnType<typeof setTimeout>   | null>(null);

  // ── Timer management ──────────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    if (tickRef.current)       { clearInterval(tickRef.current);      tickRef.current      = null; }
    if (countdownRef.current)  { clearTimeout(countdownRef.current);  countdownRef.current  = null; }
    if (processingRef.current) { clearTimeout(processingRef.current); processingRef.current = null; }
  }, []);

  const goToPhase = useCallback((next: WritingPhase, secs = 0) => {
    secsRef.current = secs;
    setSecondsLeft(secs);
    setPhase(next);
  }, []);

  // ── Phase-driven side effects ─────────────────────────────────────────────

  useEffect(() => {
    clearAll();

    switch (phase) {

      case "COUNTDOWN": {
        countdownRef.current = setTimeout(() => {
          const task = taskRef.current;
          if (!task) return;
          saveSession(task.id, task.time_limit_seconds);
          goToPhase("WRITING", task.time_limit_seconds);
        }, TOTAL_COUNTDOWN_MS);
        break;
      }

      case "WRITING": {
        tickRef.current = setInterval(() => {
          if (secsRef.current <= 1) {
            const task = taskRef.current;
            if (task) clearSession(task.id);
            clearAll();
            autoSubmitted.current = true;
            goToPhase("SUBMITTING");
          } else {
            secsRef.current -= 1;
            setSecondsLeft((s) => Math.max(0, s - 1));
          }
        }, TICK_MS);
        break;
      }

      case "SUBMITTING": {
        // Run the real API pipeline asynchronously
        runSubmitPipeline();
        break;
      }

      // PROCESSING: navigate after a brief delay so the spinner is visible
      case "PROCESSING": {
        const attemptId = attemptIdRef.current;
        if (!attemptId) break;
        processingRef.current = setTimeout(() => {
          router.push(`/attempts/${attemptId}/status`);
        }, ATTEMPT_POLL_INTERVAL_MS);
        break;
      }

      default: break;
    }

    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => clearAll, [clearAll]);

  // ── API pipeline refs ─────────────────────────────────────────────────────

  const attemptIdRef = useRef<string | null>(null);

  async function runSubmitPipeline() {
    const task = taskRef.current;
    if (!task) return;

    // ── Mock mode ─────────────────────────────────────────────────────────────
    if (USE_MOCK) {
      const mockId = `mock-attempt-${Date.now()}`;
      attemptIdRef.current = mockId;
      goToPhase("PROCESSING");
      return;
    }

    // ── Real pipeline ─────────────────────────────────────────────────────────
    try {
      const token   = await getToken();
      const headers = { ...authHeaders(token), "Content-Type": "application/json" };

      // Step 1 — create attempt (quota check happens here)
      const startRes = await fetch(`${API_BASE}${API_V1}/writing/attempts/start`, {
        method: "POST",
        headers,
        body:   JSON.stringify({ prompt_id: task.id, is_mock_test: false }),
      });
      if (!startRes.ok) {
        const err = await startRes.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? `start failed: ${startRes.status}`);
      }
      const { attempt_id } = await startRes.json() as { attempt_id: string };
      attemptIdRef.current = attempt_id;

      // Step 2 — submit essay (saves text + enqueues Celery scoring)
      const submitRes = await fetch(`${API_BASE}${API_V1}/writing/attempts/${attempt_id}/submit`, {
        method: "POST",
        headers,
        body:   JSON.stringify({
          essay_text:     plainTextRef.current,
          auto_submitted: autoSubmitted.current,
        }),
      });
      if (!submitRes.ok) {
        const err = await submitRes.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? `submit failed: ${submitRes.status}`);
      }

      // Step 3 — advance to PROCESSING (triggers navigation)
      goToPhase("PROCESSING");

    } catch (err) {
      console.error("[useWritingAttempt] Submit pipeline failed:", err);
      setSubmitError(err instanceof Error ? err.message : "Submission failed. Please try again.");
      // Revert to WRITING so the user can retry manually
      goToPhase("WRITING", secsRef.current);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  const start = useCallback((task: WritingTask) => {
    taskRef.current = task;
    autoSubmitted.current = false;

    const saved = loadSession(task.id);
    if (saved) {
      const elapsed   = Math.floor((Date.now() - saved.startedAt) / 1_000);
      const remaining = saved.totalSeconds - elapsed;

      if (remaining <= 0) {
        clearSession(task.id);
        autoSubmitted.current = true;
        goToPhase("SUBMITTING");
      } else {
        goToPhase("WRITING", remaining);
      }
    } else {
      goToPhase("COUNTDOWN");
    }
  }, [goToPhase]);

  const setContent = useCallback((_html: string, plainText: string) => {
    plainTextRef.current = plainText;
    setWordCount(countWords(plainText));
  }, []);

  const submit = useCallback(() => {
    const task = taskRef.current;
    if (task) clearSession(task.id);
    clearAll();
    autoSubmitted.current = false;
    goToPhase("SUBMITTING");
  }, [clearAll, goToPhase]);

  const exit = useCallback(() => {
    const task = taskRef.current;
    if (task) clearSession(task.id);
    clearAll();
    setPhase("IDLE");
    router.back();
  }, [clearAll, router]);

  return { phase, secondsLeft, wordCount, submitError, start, setContent, submit, exit };
}
