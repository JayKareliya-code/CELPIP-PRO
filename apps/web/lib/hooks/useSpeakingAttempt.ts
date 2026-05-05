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

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter }                                 from "next/navigation";
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
  phase:            SessionPhase;
  secondsLeft:      number;
  uploadProgress:   number;
  attemptId:        string | null;
  uploadError:      string | null;
  selectedChoice:   import("@/lib/types").ChoiceOption | null;
  /** True when the user has requested exit — mount a ConfirmModal when this is true. */
  exitRequested:    boolean;
  /** Call when the exit confirm modal Cancel button is clicked. */
  cancelExit:       () => void;
  /** Call when the exit confirm modal Confirm button is clicked. */
  confirmExit:      () => void;
  start:            (task: SpeakingTask) => void;
  /** Request exit with confirmation — sets exitRequested=true (no window.confirm). */
  exit:             () => void;
  /** Silent termination — stops mic + resets store without confirm dialog.
   *  Use in unmount effects (page navigation away). */
  terminate:        () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSpeakingAttempt(): UseSpeakingAttemptReturn {
  const router = useRouter();

  const {
    phase, secondsLeft, uploadProgress, attemptId, task,
    startSession, advancePhase, tick,
    setRecordingBlob,
    selectedChoice,
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
  const tickIntervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout>  | null>(null);

  const clearTick        = () => { if (tickIntervalRef.current)      { clearInterval(tickIntervalRef.current);      tickIntervalRef.current      = null; } };
  const clearCountdown   = () => { if (countdownTimeoutRef.current)  { clearTimeout(countdownTimeoutRef.current);   countdownTimeoutRef.current   = null; } };
  const clearProcessing  = () => { if (processingTimeoutRef.current) { clearTimeout(processingTimeoutRef.current);  processingTimeoutRef.current  = null; } };

  // ── Exit-confirm state (replaces window.confirm) ──────────────────────────
  const [exitRequested, setExitRequested] = useState(false);

  // Sub-hooks
  const { startRecording, stopRecording, stopMicStream, forceStop, recordingStartRef, mimeTypeRef } =
    useMediaRecorder();

  const { runUploadPipeline, cancelUpload, uploadError } =
    useSpeakingUpload(taskRef, recordingStartRef);

  // ── Phase-change side effects ───────────────────────────────────────────────

  useEffect(() => {
    clearTick();
    clearCountdown();
    clearProcessing();

    let cancelled = false;

    switch (phase) {

      // Auto-advance after the countdown animation completes
      case "COUNTDOWN": {
        countdownTimeoutRef.current = setTimeout(advancePhase, TOTAL_COUNTDOWN_MS);
        break;
      }

      // Tick down every second; advance phase when timer reaches zero
      case "PREP": {
        tickIntervalRef.current = setInterval(() => {
          if (secsRef.current <= 1) {
            clearTick();
            // Task 5: if the user never tapped an option, auto-select Option A
            // before advancing so Task5CurveballScreen always has a selectedChoice.
            // Must happen synchronously here — the component unmounts on advancePhase()
            // so its own useEffect never sees secondsLeft===0.
            const state = usePracticeSessionStore.getState();
            if (
              taskRef.current?.task_number === 5 &&
              !state.selectedChoice &&
              state.task?.choice_options?.[0]
            ) {
              state.setSelectedChoice(state.task.choice_options[0]);
            }
            advancePhase();
          } else {
            tick();
          }
        }, TICK_INTERVAL_MS);
        break;
      }

      // Start recorder on the first recording phase; tick for both parts.
      // NOTE — Task 5 key={phase} caveat:
      //   SpeakingPracticeSession uses key={phase} to remount children on
      //   every phase transition, which is intentional (resets local waveform
      //   state and triggers CSS entry animations). The trade-off is that
      //   MicWaveform remounts at RECORDING→RECORDING_PART2 for Task 5, causing
      //   a second getUserMedia call and a brief mic-indicator flash. This is
      //   accepted: the alternative (lifting MicWaveform out of the keyed tree)
      //   would complicate the component hierarchy significantly for a minor UX gain.
      case "RECORDING":
      case "RECORDING_PART2": {
        // Task 5: the RECORDING phase is a silent curveball-prep phase (no mic).
        // The mic starts only at RECORDING_PART2 for Task 5.
        // For all other tasks: mic starts at RECORDING as usual.
        const isTask5 = taskRef.current?.task_number === 5;
        if (phase === "RECORDING" && !isTask5) startRecording();
        if (phase === "RECORDING_PART2" && isTask5) startRecording();
        tickIntervalRef.current = setInterval(() => {
          if (secsRef.current <= 1) { clearTick(); advancePhase(); }
          else tick();
        }, TICK_INTERVAL_MS);
        break;
      }

      // Stop recorder → collect blob → run upload pipeline
      case "UPLOADING": {
        stopRecording().then((blob) => {
          if (cancelled) return;
          stopMicStream();
          setRecordingBlob(blob);
          // Forward the resolved MIME type so the S3 PUT Content-Type is accurate.
          runUploadPipeline(blob, mimeTypeRef.current || "audio/webm");
        });
        break;
      }

      // Navigate to the status-polling page
      case "PROCESSING": {
        const storedId = usePracticeSessionStore.getState().attemptId;
        if (!storedId) {
          // Guard: upload pipeline should always set attemptId before advancing.
          // If it's missing, something went wrong upstream — surface it to the user
          // via uploadError rather than silently hanging on ProcessingScreen.
          console.error("[useSpeakingAttempt] PROCESSING reached with no attemptId — resetting.");
          reset();
          break;
        }
        processingTimeoutRef.current = setTimeout(() => {
          router.push(`/attempts/${storedId}/status`);
        }, ATTEMPT_POLL_INTERVAL_MS);
        break;
      }

      default:
        break;
    }

    return () => {
      cancelled = true;
      clearTick();
      clearCountdown();
      clearProcessing();
      cancelUpload();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearTick();
      clearCountdown();
      clearProcessing();
      cancelUpload();
      forceStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public API ──────────────────────────────────────────────────────────────

  const start = useCallback((speakingTask: SpeakingTask) => {
    startSession(speakingTask);
  }, [startSession]);

  /** Request exit — sets exitRequested flag; parent renders ConfirmModal. */
  const exit = useCallback(() => {
    setExitRequested(true);
  }, []);

  const cancelExit = useCallback(() => {
    setExitRequested(false);
  }, []);

  const confirmExit = useCallback(() => {
    setExitRequested(false);
    forceStop();
    reset();
    router.back();
  }, [reset, router, forceStop]);

  // Silent teardown — no confirm dialog, no navigation. Used by the session
  // component's unmount effect when the user navigates away themselves.
  const terminate = useCallback(() => {
    forceStop();
    reset();
  }, [forceStop, reset]);

  return {
    phase, secondsLeft, uploadProgress, attemptId, uploadError, selectedChoice,
    exitRequested, cancelExit, confirmExit,
    start, exit, terminate,
  };
}
