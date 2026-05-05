// ─────────────────────────────────────────────────────────────────────────────
// speaking-constants.ts — Shared constants for the speaking practice module.
//
// Single source of truth for task metadata used across:
//   - SpeakingModuleHome       (task grid)
//   - TaskPromptsFolder        (prompt list)
//   - SpeakingPracticeSession  (individual task practice)
//   - MockExamShell            (full mock exam)
//   - ExamInfoBar / MockExamInfoBar
//
// Add new entries here — never duplicate these maps in component files.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Official CELPIP speaking task titles keyed by task_number.
 *
 * task_number 0 is the "Practice Task" used in the admin practice pool
 * (not part of the real CELPIP exam). Tasks 1–8 match the official exam.
 */
export const SPEAKING_TASK_TITLES: Record<number, string> = {
  0: "Practice Task",
  1: "Giving Advice",
  2: "Talking about a Personal Experience",
  3: "Describing a Scene",
  4: "Making Predictions",
  5: "Comparing and Persuading",
  6: "Dealing with a Difficult Situation",
  7: "Expressing Opinions",
  8: "Describing an Unusual Situation",
};

/**
 * Resolve the display title for a given task number.
 *
 * Falls back to the raw `title` field from the DB (if supplied), then to a
 * generic "Speaking Task N" label — so the UI is never empty even when new
 * task types are added without a corresponding entry above.
 */
export function getSpeakingTaskTitle(
  taskNumber: number,
  fallbackTitle?: string | null,
): string {
  return (
    SPEAKING_TASK_TITLES[taskNumber] ??
    fallbackTitle ??
    `Speaking Task ${taskNumber}`
  );
}

/**
 * Short task descriptions shown on module home cards and prompt-folder headers.
 * Keyed by task_number (0 = Practice Task; 1–8 = official CELPIP tasks).
 */
export const SPEAKING_TASK_DESCRIPTIONS: Record<number, string> = {
  0: "Warm-up. Describe your daily routine or a familiar topic. Not scored.",
  1: "Give advice to a friend or colleague about a personal or professional situation.",
  2: "Share a personal story — an event, challenge, or memorable experience.",
  3: "Look at an image and describe what you see in detail.",
  4: "Study three images and make reasonable predictions about future outcomes.",
  5: "Compare two options, state your preference, then argue for the other side.",
  6: "Handle a real-life scenario — leave a message, resolve a conflict, or ask for help.",
  7: "Share and defend your opinion on a current issue using clear reasoning.",
  8: "Describe an unusual scene, explain what led to it, and predict what happens next.",
};
