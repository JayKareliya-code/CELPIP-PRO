// ─────────────────────────────────────────────────────────────────────────────
// useWritingAttempt.ts — Writing session orchestration hook
//
// State persistence across page refreshes:
//   When WRITING phase begins, the session start time is saved to sessionStorage.
//   On `start(task)` if a previous session is found for the same task:
//     • remaining seconds = totalSeconds − elapsed → resumes mid-timer
//     • skips COUNTDOWN and goes straight to WRITING
//     • if time has already expired → immediately submits
//
// Phase machine:
//   IDLE → COUNTDOWN → WRITING → SUBMITTING → PROCESSING → DONE
//   (on resume) IDLE → WRITING (skips COUNTDOWN)
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter }   from "next/navigation";
import { countWords }  from "@/lib/utils";
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
  phase:       WritingPhase;
  secondsLeft: number;
  wordCount:   number;
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

const TICK_MS              = 1_000;
const TOTAL_COUNTDOWN_MS   = COUNTDOWN_STEPS.length * COUNTDOWN_STEP_DURATION_MS;
const MOCK_UPLOAD_TOTAL_MS = 1_800;
const MOCK_PROCESSING_DELAY = ATTEMPT_POLL_INTERVAL_MS;

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Writing session state machine with refresh-proof timer resumption.
 *
 * On a fresh start: IDLE → COUNTDOWN → WRITING
 * On page refresh:  IDLE → WRITING (timer resumes from saved timestamp)
 */
export function useWritingAttempt(): UseWritingAttemptReturn {
  const router = useRouter();

  const [phase,       setPhase]       = useState<WritingPhase>("IDLE");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [wordCount,   setWordCount]   = useState(0);

  const taskRef       = useRef<WritingTask | null>(null);
  const secsRef       = useRef(0);
  const tickRef       = useRef<ReturnType<typeof setInterval>  | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setTimeout>   | null>(null);
  const processingRef = useRef<ReturnType<typeof setTimeout>   | null>(null);

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

  // ── Phase-driven side effects ──────────────────────────────────────────────

  useEffect(() => {
    clearAll();

    switch (phase) {

      case "COUNTDOWN": {
        countdownRef.current = setTimeout(() => {
          const task = taskRef.current;
          if (!task) return;
          // Persist start time so a refresh can resume
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
            goToPhase("SUBMITTING");
          } else {
            secsRef.current -= 1;
            setSecondsLeft((s) => Math.max(0, s - 1));
          }
        }, TICK_MS);
        break;
      }

      case "SUBMITTING": {
        processingRef.current = setTimeout(
          () => goToPhase("PROCESSING"),
          MOCK_UPLOAD_TOTAL_MS
        );
        break;
      }

      case "PROCESSING": {
        const mockId = `mock-attempt-${Date.now()}`;
        processingRef.current = setTimeout(() => {
          router.push(`/attempts/${mockId}/status`);
        }, MOCK_PROCESSING_DELAY);
        break;
      }

      default: break;
    }

    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => clearAll, [clearAll]);

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Called on mount. Checks sessionStorage for a persisted session:
   *   - Found + time remaining → jump straight to WRITING with elapsed time
   *   - Found + expired        → go directly to SUBMITTING
   *   - Not found              → normal COUNTDOWN → WRITING flow
   */
  const start = useCallback((task: WritingTask) => {
    taskRef.current = task;

    const saved = loadSession(task.id);
    if (saved) {
      const elapsed   = Math.floor((Date.now() - saved.startedAt) / 1_000);
      const remaining = saved.totalSeconds - elapsed;

      if (remaining <= 0) {
        // Time ran out while the tab was closed — auto-submit immediately
        clearSession(task.id);
        goToPhase("SUBMITTING");
      } else {
        // Resume mid-timer — skip countdown, go straight to WRITING
        // Re-save with the original startedAt so the countdown is still correct
        goToPhase("WRITING", remaining);
      }
    } else {
      goToPhase("COUNTDOWN");
    }
  }, [goToPhase]);

  const setContent = useCallback((_html: string, plainText: string) => {
    setWordCount(countWords(plainText));
  }, []);

  const submit = useCallback(() => {
    const task = taskRef.current;
    if (task) clearSession(task.id);
    clearAll();
    goToPhase("SUBMITTING");
  }, [clearAll, goToPhase]);

  const exit = useCallback(() => {
    const task = taskRef.current;
    if (task) clearSession(task.id);
    clearAll();
    setPhase("IDLE");
    router.back();
  }, [clearAll, router]);

  return { phase, secondsLeft, wordCount, start, setContent, submit, exit };
}
