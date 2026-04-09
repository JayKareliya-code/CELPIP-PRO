// ─────────────────────────────────────────────────────────────────────────────
// practiceSessionStore.ts — Zustand store for active speaking practice sessions
//
// State machine phases:
//   IDLE → COUNTDOWN → PREP → RECORDING → RECORDING_PART2 (Task 5 only)
//        → UPLOADING → PROCESSING → DONE
//
// This store is the single source of truth for all timed session state.
// Components should NEVER manage their own timer intervals — delegate here.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import type { SpeakingTask, ChoiceOption } from "@/lib/types";

// ── Phase type ────────────────────────────────────────────────────────────────

export type SessionPhase =
  | "IDLE"
  | "COUNTDOWN"
  | "PREP"
  | "RECORDING"
  | "RECORDING_PART2"
  | "UPLOADING"
  | "PROCESSING"
  | "DONE";

// ── State shape ───────────────────────────────────────────────────────────────

export interface PracticeSessionState {
  /** The task currently being practised. Null when idle. */
  task: SpeakingTask | null;

  /** Current phase of the session state machine. */
  phase: SessionPhase;

  /** Seconds remaining in the current timed phase. */
  secondsLeft: number;

  /** Upload progress 0–100 (used during UPLOADING phase). */
  uploadProgress: number;

  /** The attempt ID returned by the API after upload (used to poll status). */
  attemptId: string | null;

  /** Raw audio blob captured by MediaRecorder during RECORDING phase. */
  recordingBlob: Blob | null;

  /**
   * Task 5 only: the option the user tapped during the PREP (selection) phase.
   * Used by Task5CurveballScreen to show "Your choice" during RECORDING / RECORDING_PART2.
   */
  selectedChoice: ChoiceOption | null;

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Initialise a fresh session for a task and enter COUNTDOWN. */
  startSession: (task: SpeakingTask) => void;

  /** Advance to the next logical phase (called by the hook's timer logic). */
  advancePhase: () => void;

  /** Decrement the seconds counter by one tick. */
  tick: () => void;

  /** Set the upload progress percentage (0–100). */
  setUploadProgress: (pct: number) => void;

  /** Store the attempt ID once the API responds. */
  setAttemptId: (id: string) => void;

  /** Store the raw audio blob captured during recording. */
  setRecordingBlob: (blob: Blob | null) => void;

  /** Task 5: store the option the user selected during the PREP phase. */
  setSelectedChoice: (choice: ChoiceOption) => void;

  /** Hard reset — use when navigating away or on error. */
  reset: () => void;
}

// ── Initial (idle) state ──────────────────────────────────────────────────────

const INITIAL_STATE: Pick<
  PracticeSessionState,
  "task" | "phase" | "secondsLeft" | "uploadProgress" | "attemptId" | "recordingBlob" | "selectedChoice"
> = {
  task:           null,
  phase:          "IDLE",
  secondsLeft:    0,
  uploadProgress: 0,
  attemptId:      null,
  recordingBlob:  null,
  selectedChoice: null,
};

// ── Helper — seconds for a given phase ────────────────────────────────────────

function secondsForPhase(phase: SessionPhase, task: SpeakingTask): number {
  switch (phase) {
    case "PREP":
      return task.prep_time_seconds;
    case "RECORDING":
    case "RECORDING_PART2":
      return task.response_time_seconds;
    default:
      return 0;
  }
}

// ── Next phase resolver ────────────────────────────────────────────────────────

function nextPhase(current: SessionPhase, task: SpeakingTask): SessionPhase {
  switch (current) {
    case "COUNTDOWN":  return "PREP";
    case "PREP":       return "RECORDING";
    case "RECORDING":  return task.has_parts ? "RECORDING_PART2" : "UPLOADING";
    case "RECORDING_PART2": return "UPLOADING";
    case "UPLOADING":  return "PROCESSING";
    case "PROCESSING": return "DONE";
    default:           return "IDLE";
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const usePracticeSessionStore = create<PracticeSessionState>((set, get) => ({
  ...INITIAL_STATE,

  startSession: (task) => {
    set({
      task,
      phase:          "COUNTDOWN",
      secondsLeft:    0,
      uploadProgress: 0,
      attemptId:      null,
      selectedChoice: null,   // always clear any previous Task 5 selection
    });
  },

  advancePhase: () => {
    const { task, phase } = get();
    if (!task) return;

    const next = nextPhase(phase, task);
    const secs = secondsForPhase(next, task);

    set({ phase: next, secondsLeft: secs });
  },

  tick: () => {
    set((s) => ({ secondsLeft: Math.max(0, s.secondsLeft - 1) }));
  },

  setUploadProgress: (pct) => {
    set({ uploadProgress: Math.min(100, Math.max(0, pct)) });
  },

  setAttemptId: (id) => {
    set({ attemptId: id });
  },

  setRecordingBlob: (blob) => {
    set({ recordingBlob: blob });
  },

  setSelectedChoice: (choice) => {
    set({ selectedChoice: choice });
  },

  reset: () => {
    set({ ...INITIAL_STATE });
  },
}));
