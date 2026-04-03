"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useSpeakingAttempt — phase-level orchestration for a speaking practice session.
//
// Phase flow:
//   COUNTDOWN → PREP → RECORDING → UPLOADING → PROCESSING
//
// Delegates to:
//   useMediaRecorder   — mic access + recorder lifecycle
//   useSpeakingUpload  — 4-step API upload pipeline (+ mock simulation)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from "react";
import { useRouter }                      from "next/navigation";
import {
  usePracticeSessionStore,
  type SessionPhase,
} from "@/store/practiceSessionStore";
import type { SpeakingTask }    from "@/lib/types";
import {
  COUNTDOWN_STEP_DURATION_MS,
  COUNTDOWN_STEPS,
  ATTEMPT_POLL_INTERVAL_MS,
} from "@/lib/constants";
import { useMediaRecorder }    from "./speaking/useMediaRecorder";
import { useSpeakingUpload }   from "./speaking/useSpeakingUpload";

// ── Internal constants ────────────────────────────────────────────────────────

const TICK_INTERVAL_MS   = 1_000;
const TOTAL_COUNTDOWN_MS = COUNTDOWN_STEPS.length * COUNTDOWN_STEP_DURATION_MS;

// ── Hook public interface ─────────────────────────────────────────────────────

export interface UseSpeakingAttemptReturn {
  phase:          SessionPhase;
  secondsLeft:    number;
  uploadProgress: number;
  attemptId:      string | null;
  uploadError:    string | null;
  start:          (task: SpeakingTask) => void;
  exit:           () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSpeakingAttempt(): UseSpeakingAttemptReturn {
  const router = useRouter();

  const {
    phase, secondsLeft, uploadProgress, attemptId, task,
    startSession, advancePhase, tick,
    setUploadProgress, setRecordingBlob,
    reset,
  } = usePracticeSessionStore();

  // Stable refs so interval callbacks always read fresh state without stale closure
  const phaseRef = useRef(phase);
  const secsRef  = useRef(secondsLeft);
  const taskRef  = useRef(task);
  phaseRef.current = phase;
  secsRef.current  = secondsLeft;
  taskRef.current  = task;

  // Timer handles
  const tickIntervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimeoutRef = useRef<ReturnType<typeof setTimeout>  | null>(null);

  const clearTick      = () => { if (tickIntervalRef.current)    clearInterval(tickIntervalRef.current);    tickIntervalRef.current    = null; };
  const clearCountdown = () => { if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current); countdownTimeoutRef.current = null; };

  // Sub-hooks
  const { startRecording, stopRecording, stopMicStream, forceStop, recordingStartRef } =
    useMediaRecorder();

  const { runUploadPipeline, cancelMockUpload, uploadError } =
    useSpeakingUpload(taskRef, recordingStartRef);

  // ── Phase-change side effects ───────────────────────────────────────────────

  useEffect(() => {
    clearTick();
    clearCountdown();
    cancelMockUpload();

    switch (phase) {

      // Auto-advance after the countdown animation completes
      case "COUNTDOWN": {
        countdownTimeoutRef.current = setTimeout(advancePhase, TOTAL_COUNTDOWN_MS);
        break;
      }

      // Tick down every second; advance phase when timer reaches zero
      case "PREP": {
        tickIntervalRef.current = setInterval(() => {
          if (secsRef.current <= 1) { clearTick(); advancePhase(); }
          else tick();
        }, TICK_INTERVAL_MS);
        break;
      }

      // Start recorder on the first recording phase; tick for both parts
      case "RECORDING":
      case "RECORDING_PART2": {
        if (phase === "RECORDING") startRecording();
        tickIntervalRef.current = setInterval(() => {
          if (secsRef.current <= 1) { clearTick(); advancePhase(); }
          else tick();
        }, TICK_INTERVAL_MS);
        break;
      }

      // Stop recorder → collect blob → run upload pipeline
      case "UPLOADING": {
        stopRecording().then((blob) => {
          stopMicStream();
          setRecordingBlob(blob);
          runUploadPipeline(blob);
        });
        break;
      }

      // Navigate to the status-polling page
      case "PROCESSING": {
        const storedId = usePracticeSessionStore.getState().attemptId;
        if (!storedId) {
          // Guard: upload pipeline should always set attemptId before advancing.
          console.error("[useSpeakingAttempt] PROCESSING reached with no attemptId");
          break;
        }
        setTimeout(() => {
          router.push(`/attempts/${storedId}/status`);
        }, ATTEMPT_POLL_INTERVAL_MS);
        break;
      }

      default:
        break;
    }

    return () => {
      clearTick();
      clearCountdown();
      cancelMockUpload();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearTick();
      clearCountdown();
      cancelMockUpload();
      forceStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public API ──────────────────────────────────────────────────────────────

  const start = useCallback((speakingTask: SpeakingTask) => {
    startSession(speakingTask);
  }, [startSession]);

  const exit = useCallback(() => {
    const confirmed = window.confirm(
      "Are you sure you want to leave this practice session?"
    );
    if (confirmed) {
      forceStop();
      reset();
      router.back();
    }
  }, [reset, router, forceStop]);

  return { phase, secondsLeft, uploadProgress, attemptId, uploadError, start, exit };
}
