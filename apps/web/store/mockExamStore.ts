// ─────────────────────────────────────────────────────────────────────────────
// mockExamStore.ts — Zustand store for the full CELPIP speaking mock exam.
//
// Exam-level state machine phases:
//   IDLE → LOADING → READY → TASK_COUNTDOWN → TASK_PREP
//        → TASK_RECORDING → TASK_RECORDING_PART2?
//        → TASK_UPLOADING → INTER_TASK_BREAK
//        → (repeat from TASK_COUNTDOWN for next task)
//        → COMPLETE | ERROR
//
// Key design rules:
//   • This store owns exam-level orchestration only.
//   • Per-task timer ticks (secondsLeft / breakSecondsLeft) are decremented here.
//   • Mic and upload side-effects are handled in useMockExamSession.
//   • practiceSessionStore is NOT used — we keep state fully isolated.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import type {
  MockExamTask,
  MockExamPrompt,
  ChoiceOption,
} from "@/lib/types";
import { MOCK_EXAM_BREAK_SECONDS } from "@/lib/practice/config";

// ── Phase type ────────────────────────────────────────────────────────────────

export type MockExamPhase =
  | "IDLE"
  | "LOADING"             // fetching prompts
  | "READY"               // intro screen, waiting for "Begin Exam"
  | "TASK_COUNTDOWN"      // 3-2-1-GO before each task
  | "TASK_PREP"           // prep timer
  | "TASK_RECORDING"      // recording (Part 1 / only part)
  | "TASK_RECORDING_PART2" // Task 5 Part 2 (curveball speaking)
  | "TASK_UPLOADING"      // uploading current task audio during break
  | "INTER_TASK_BREAK"    // 30 s countdown between tasks
  | "COMPLETE"            // all 8 tasks done
  | "ERROR";

// ── State shape ───────────────────────────────────────────────────────────────

export interface MockExamState {
  phase: MockExamPhase;
  /** All 8 task slots. Populated after LOADING. */
  tasks: MockExamTask[];
  /** 0-based index of the currently active task. */
  currentIndex: number;
  /** Stable UUID shared across all 8 tasks — used as the S3 folder key. */
  examSessionId: string;
  /** Seconds remaining in the current task phase (PREP / RECORDING / RECORDING_PART2). */
  secondsLeft: number;
  /** Seconds remaining in the inter-task break. */
  breakSecondsLeft: number;
  /** Upload progress 0–100 for the current task. */
  uploadProgress: number;
  /** Raw audio blob from MediaRecorder for the current in-progress task. */
  recordingBlob: Blob | null;
  /** Task 5 user choice (cleared on each new task). */
  selectedChoice: ChoiceOption | null;
  /** Error message when phase === "ERROR". */
  errorMessage: string | null;

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Enter LOADING — called before the prompt fetch begins. Accepts the
   *  exam slot number so the session UUID can be stabilised across page
   *  navigations (retakes reuse the same session_id → no quota inflation). */
  beginLoading: (slotNumber: number) => void;
  /** Populate tasks and enter READY (intro screen). */
  loadExam: (prompts: MockExamPrompt[]) => void;
  /** User pressed "Begin Exam" — enter TASK_COUNTDOWN for task 0. */
  startExam: () => void;
  /** Advance within the current task's phase sequence. */
  advanceTaskPhase: () => void;
  /** Called by the hook when the current task upload finishes. */
  finishTaskUpload: (attemptId: string) => void;
  /** Called when the inter-task break countdown reaches zero. */
  advanceToNextTask: () => void;
  /** Decrement secondsLeft by 1 tick. */
  tickTask: () => void;
  /** Decrement breakSecondsLeft by 1 tick. */
  tickBreak: () => void;
  /** Set upload progress for the current task (0–100). */
  setUploadProgress: (pct: number) => void;
  /** Store raw audio blob captured during recording. */
  setRecordingBlob: (blob: Blob | null) => void;
  /** Task 5: store the user's selection made during TASK_PREP. */
  setSelectedChoice: (choice: ChoiceOption) => void;
  /** Mark current task as error without stopping the whole exam. */
  setTaskError: () => void;
  /** Store estimated band for a completed task (after scoring). */
  setTaskBand: (taskNumber: number, band: number) => void;
  /** Enter ERROR state with a message. */
  setError: (message: string) => void;
  /** Hard reset — use when navigating away. */
  reset: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTaskSlots(prompts: MockExamPrompt[]): MockExamTask[] {
  return prompts.map((p) => ({
    taskNumber: p.task_number,
    prompt: p,
    attemptId: null,
    estimatedBand: null,
    status: "pending" as const,
  }));
}

function secondsForPhase(
  phase: MockExamPhase,
  prompt: MockExamPrompt,
): number {
  switch (phase) {
    case "TASK_PREP":
      return prompt.prep_time_seconds;
    case "TASK_RECORDING":
    case "TASK_RECORDING_PART2":
      return prompt.response_time_seconds;
    default:
      return 0;
  }
}

function nextTaskPhase(
  current: MockExamPhase,
  prompt: MockExamPrompt,
): MockExamPhase {
  switch (current) {
    case "TASK_COUNTDOWN": return "TASK_PREP";
    case "TASK_PREP": return "TASK_RECORDING";
    case "TASK_RECORDING":
      // Task 5: RECORDING is silent curveball-prep, so advance to PART2
      if (prompt.task_number === 5 && prompt.curveball_option) {
        return "TASK_RECORDING_PART2";
      }
      // Tasks with two mic parts (has_parts but not task 5)
      if (prompt.has_parts) return "TASK_RECORDING_PART2";
      return "TASK_UPLOADING";
    case "TASK_RECORDING_PART2":
      return "TASK_UPLOADING";
    default:
      return "TASK_UPLOADING";
  }
}

// ── Initial state ──────────────────────────────────────────────────────────────

const INITIAL: Pick<
  MockExamState,
  | "phase" | "tasks" | "currentIndex" | "examSessionId" | "secondsLeft"
  | "breakSecondsLeft" | "uploadProgress" | "recordingBlob"
  | "selectedChoice" | "errorMessage"
> = {
  phase: "IDLE",
  tasks: [],
  currentIndex: 0,
  examSessionId: "",
  secondsLeft: 0,
  breakSecondsLeft: 0,
  uploadProgress: 0,
  recordingBlob: null,
  selectedChoice: null,
  errorMessage: null,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useMockExamStore = create<MockExamState>((set, get) => ({
  ...INITIAL,

  beginLoading: (slotNumber: number) => {
    // Derive a localStorage key that is user-agnostic but slot-specific.
    // We scope it to "speaking" here because this store is speaking-only.
    const storageKey = `celpip-mock-session-speaking-${slotNumber}`;

    // Try to restore the session ID that was previously used for this slot.
    // This is the core of the retake-dedup fix: if the user navigates away
    // and comes back to the same slot, we must reuse the same UUID so the
    // backend's COUNT(DISTINCT session_id) query doesn't inflate.
    let examSessionId: string;
    try {
      const stored = localStorage.getItem(storageKey);
      examSessionId = stored || "";
    } catch {
      examSessionId = get().examSessionId;
    }

    // If no stored ID exists (first-ever attempt on this slot), generate one
    // and persist it immediately so future retakes can reuse it.
    if (!examSessionId) {
      examSessionId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
            });
      try {
        localStorage.setItem(storageKey, examSessionId);
      } catch { /* storage quota or SSR — non-fatal */ }
    }

    set({ ...INITIAL, phase: "LOADING", examSessionId });
  },

  loadExam: (prompts) => {
    set({
      tasks: makeTaskSlots(prompts),
      currentIndex: 0,
      phase: "READY",
    });
  },

  startExam: () => {
    const { tasks } = get();
    if (!tasks.length) return;
    const updatedTasks = tasks.map((t, i) =>
      i === 0 ? { ...t, status: "active" as const } : t
    );
    // NOTE: examSessionId is intentionally NOT re-generated here.
    // It was loaded from localStorage (or freshly minted) in beginLoading()
    // and must survive startExam() so the backend always sees the same
    // session_id for this exam slot — keeping COUNT(DISTINCT session_id) stable.
    set({
      tasks: updatedTasks,
      currentIndex: 0,
      phase: "TASK_COUNTDOWN",
      secondsLeft: 0,
      selectedChoice: null,
      recordingBlob: null,
    });
  },

  advanceTaskPhase: () => {
    const { phase, currentIndex, tasks } = get();
    const prompt = tasks[currentIndex]?.prompt;
    if (!prompt) return;

    const next = nextTaskPhase(phase, prompt);
    const secs = secondsForPhase(next, prompt);

    if (next === "TASK_UPLOADING") {
      // Uploading is triggered as a side-effect in the hook — just advance phase
      set({ phase: next, secondsLeft: 0, uploadProgress: 0 });
    } else {
      set({ phase: next, secondsLeft: secs });
    }
  },

  finishTaskUpload: (attemptId) => {
    const { currentIndex, tasks } = get();
    const updated = tasks.map((t, i) =>
      i === currentIndex
        ? { ...t, attemptId, status: "done" as const }
        : t
    );
    set({
      tasks: updated,
      phase: "INTER_TASK_BREAK",
      breakSecondsLeft: MOCK_EXAM_BREAK_SECONDS,
      uploadProgress: 0,
      recordingBlob: null,
      selectedChoice: null,
    });
  },

  advanceToNextTask: () => {
    const { tasks, currentIndex } = get();
    const nextIndex = currentIndex + 1;

    if (nextIndex >= tasks.length) {
      // All 8 tasks done
      set({ phase: "COMPLETE", breakSecondsLeft: 0 });
      return;
    }

    const updated = tasks.map((t, i) =>
      i === nextIndex ? { ...t, status: "active" as const } : t
    );

    set({
      tasks: updated,
      currentIndex: nextIndex,
      phase: "TASK_COUNTDOWN",
      secondsLeft: 0,
      selectedChoice: null,
      recordingBlob: null,
    });
  },

  tickTask: () => {
    set((s) => ({ secondsLeft: Math.max(0, s.secondsLeft - 1) }));
  },

  tickBreak: () => {
    set((s) => ({ breakSecondsLeft: Math.max(0, s.breakSecondsLeft - 1) }));
  },

  setUploadProgress: (pct) => {
    set({ uploadProgress: Math.min(100, Math.max(0, pct)) });
  },

  setRecordingBlob: (blob) => {
    set({ recordingBlob: blob });
  },

  setSelectedChoice: (choice) => {
    set({ selectedChoice: choice });
  },

  setTaskError: () => {
    const { currentIndex, tasks } = get();
    const updated = tasks.map((t, i) =>
      i === currentIndex ? { ...t, status: "error" as const } : t
    );
    // Mark task as error but continue to the break/next task
    set({
      tasks: updated,
      phase: "INTER_TASK_BREAK",
      breakSecondsLeft: MOCK_EXAM_BREAK_SECONDS,
      recordingBlob: null,
    });
  },

  setTaskBand: (taskNumber, band) => {
    const updated = get().tasks.map((t) =>
      t.taskNumber === taskNumber ? { ...t, estimatedBand: band } : t
    );
    set({ tasks: updated });
  },

  setError: (message) => {
    set({ phase: "ERROR", errorMessage: message });
  },

  reset: () => {
    // NOTE: We intentionally reset examSessionId to "" here.
    // The stable session UUID is persisted in localStorage (keyed by slot)
    // and will be restored from there on the next call to beginLoading().
    // Resetting the in-memory ID prevents stale state leaking between slots.
    set({ ...INITIAL });
  },
}));
