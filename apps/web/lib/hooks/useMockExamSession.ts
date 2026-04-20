"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useMockExamSession — top-level orchestration hook for the full speaking exam.
//
// Follows the same pattern as useSpeakingAttempt but operates over
// mockExamStore (not practiceSessionStore).
//
// Responsibilities:
//   • useEffect(phase) — start/stop timers, mic, upload for each phase change.
//   • Delegates mic lifecycle to useMediaRecorder (reused as-is).
//   • Delegates audio upload to useMockTaskUpload (new, mock-tests/ prefix).
//   • Exposes a clean public interface consumed by MockExamShell.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from "react";
import { useRouter }                      from "next/navigation";
import {
  useMockExamStore,
  type MockExamPhase,
}                                         from "@/store/mockExamStore";
import { useMediaRecorder }               from "./speaking/useMediaRecorder";
import { useMockTaskUpload }              from "./useMockTaskUpload";
import {
  COUNTDOWN_STEPS,
  COUNTDOWN_STEP_DURATION_MS,
} from "@/lib/constants";
import type { MockExamTask, MockExamPrompt, ChoiceOption } from "@/lib/types";

// ── Internal constants ────────────────────────────────────────────────────────

const TICK_MS            = 1_000;
const TOTAL_COUNTDOWN_MS = COUNTDOWN_STEPS.length * COUNTDOWN_STEP_DURATION_MS;

// ── Public interface ──────────────────────────────────────────────────────────

export interface UseMockExamSessionReturn {
  phase:            MockExamPhase;
  tasks:            MockExamTask[];
  currentTask:      MockExamTask | null;
  currentTaskIndex: number;
  totalTasks:       number;
  secondsLeft:      number;
  breakSecondsLeft: number;
  uploadProgress:   number;
  selectedChoice:   ChoiceOption | null;
  uploadError:      string | null;
  examSessionId:    string;
  /** Called once prompts are loaded — populates the store and shows the intro screen. */
  initExam:         (prompts: MockExamPrompt[]) => void;
  /** User tapped "Begin Exam" on the intro screen. */
  startExam:        () => void;
  /** User selected a choice during Task 5 PREP phase. */
  selectChoice:     (choice: ChoiceOption) => void;
  /** Exits the exam mid-session (with confirm dialog). */
  exit:             () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMockExamSession(): UseMockExamSessionReturn {
  const router = useRouter();

  const {
    phase, tasks, currentIndex, secondsLeft, breakSecondsLeft,
    uploadProgress, selectedChoice, recordingBlob, examSessionId,
    beginLoading, loadExam, startExam: storeStartExam,
    advanceTaskPhase, finishTaskUpload, advanceToNextTask,
    tickTask, tickBreak, setUploadProgress, setRecordingBlob,
    setSelectedChoice, setTaskError, setError, reset,
  } = useMockExamStore();

  const currentTask = tasks[currentIndex] ?? null;

  // ── Stable refs so interval callbacks always see fresh state ────────────────
  const phaseRef        = useRef(phase);
  const secsRef         = useRef(secondsLeft);
  const breakSecsRef    = useRef(breakSecondsLeft);
  const currentTaskRef  = useRef(currentTask);
  const selectedChoiceRef = useRef(selectedChoice);

  phaseRef.current         = phase;
  secsRef.current          = secondsLeft;
  breakSecsRef.current     = breakSecondsLeft;
  currentTaskRef.current   = currentTask;
  selectedChoiceRef.current = selectedChoice;

  // ── Timer handles ────────────────────────────────────────────────────────────
  const taskTickRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const breakTickRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef     = useRef<ReturnType<typeof setTimeout>  | null>(null);

  const clearTaskTick  = () => { if (taskTickRef.current)  { clearInterval(taskTickRef.current);  taskTickRef.current  = null; } };
  const clearBreakTick = () => { if (breakTickRef.current) { clearInterval(breakTickRef.current); breakTickRef.current = null; } };
  const clearCountdown = () => { if (countdownRef.current) { clearTimeout(countdownRef.current);  countdownRef.current = null; } };
  const clearAll       = () => { clearTaskTick(); clearBreakTick(); clearCountdown(); };

  // ── Sub-hooks ────────────────────────────────────────────────────────────────
  const { startRecording, stopRecording, stopMicStream, forceStop, recordingStartRef } =
    useMediaRecorder();

  const { runMockTaskUpload, cancelMockUpload, uploadError } =
    useMockTaskUpload(setUploadProgress);

  // ── Phase-change effects ─────────────────────────────────────────────────────

  useEffect(() => {
    clearAll();
    cancelMockUpload();

    const prompt = currentTaskRef.current?.prompt;

    switch (phase) {

      // ── 3-2-1-GO countdown before each task ──────────────────────────────
      case "TASK_COUNTDOWN": {
        countdownRef.current = setTimeout(() => {
          advanceTaskPhase();
        }, TOTAL_COUNTDOWN_MS);
        break;
      }

      // ── Prep timer ────────────────────────────────────────────────────────
      case "TASK_PREP": {
        taskTickRef.current = setInterval(() => {
          if (secsRef.current <= 1) {
            clearTaskTick();
            // Task 5: auto-select Option A if user never chose
            const state = useMockExamStore.getState();
            if (
              currentTaskRef.current?.prompt.task_number === 5 &&
              !state.selectedChoice &&
              state.tasks[state.currentIndex]?.prompt.choice_options?.[0]
            ) {
              state.setSelectedChoice(
                state.tasks[state.currentIndex].prompt.choice_options![0]
              );
            }
            advanceTaskPhase();
          } else {
            tickTask();
          }
        }, TICK_MS);
        break;
      }

      // ── Recording phases ──────────────────────────────────────────────────
      case "TASK_RECORDING":
      case "TASK_RECORDING_PART2": {
        const isTask5 = prompt?.task_number === 5;
        // Task 5: TASK_RECORDING = silent curveball-prep; mic starts at PART2
        if (phase === "TASK_RECORDING" && !isTask5) startRecording();
        if (phase === "TASK_RECORDING_PART2" && isTask5) startRecording();

        taskTickRef.current = setInterval(() => {
          if (secsRef.current <= 1) {
            clearTaskTick();
            advanceTaskPhase();
          } else {
            tickTask();
          }
        }, TICK_MS);
        break;
      }

      // ── Upload current task audio during the break ────────────────────────
      case "TASK_UPLOADING": {
        stopRecording().then(async (blob) => {
          stopMicStream();
          setRecordingBlob(blob);

          if (!prompt) { setTaskError(); return; }

          // Use the stable UUID generated at exam-start so all 8 task recordings
          // share the same S3 folder: mock-tests/{userId}/{examSessionId}/task-N.webm
          const sessionId = examSessionId || `fallback-${Date.now()}`;
          const attemptId = await runMockTaskUpload(
            blob,
            prompt,
            sessionId,
            recordingStartRef.current,
          );

          if (attemptId) {
            finishTaskUpload(attemptId);
          } else {
            // Upload failed — mark error but continue with next task
            setTaskError();
          }
        });
        break;
      }

      // ── Inter-task break countdown ────────────────────────────────────────
      case "INTER_TASK_BREAK": {
        breakTickRef.current = setInterval(() => {
          if (breakSecsRef.current <= 1) {
            clearBreakTick();
            advanceToNextTask();
          } else {
            tickBreak();
          }
        }, TICK_MS);
        break;
      }

      default:
        break;
    }

    return () => {
      clearAll();
      cancelMockUpload();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearAll();
      cancelMockUpload();
      forceStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────────

  const initExam = useCallback((prompts: MockExamPrompt[]) => {
    // Fire beginLoading immediately so the shell shows ExamLoadingScreen.
    // loadExam is called on the next microtask so the LOADING phase is
    // actually rendered before the store transitions to READY.
    beginLoading();
    Promise.resolve().then(() => loadExam(prompts));
  }, [beginLoading, loadExam]);

  const startExam = useCallback(() => {
    storeStartExam();
  }, [storeStartExam]);

  const selectChoice = useCallback((choice: ChoiceOption) => {
    setSelectedChoice(choice);
  }, [setSelectedChoice]);

  const exit = useCallback(() => {
    const confirmed = window.confirm(
      "Are you sure you want to exit the exam? Your progress so far will not be scored."
    );
    if (confirmed) {
      forceStop();
      reset();
      router.push("/practice/speaking");
    }
  }, [forceStop, reset, router]);

  return {
    phase,
    tasks,
    currentTask,
    currentTaskIndex: currentIndex,
    totalTasks:       tasks.length,
    secondsLeft,
    breakSecondsLeft,
    uploadProgress,
    selectedChoice,
    uploadError,
    examSessionId,
    initExam,
    startExam,
    selectChoice,
    exit,
  };
}
