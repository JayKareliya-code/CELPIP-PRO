// ─────────────────────────────────────────────────────────────────────────────
// lib/admin/writingTaskMeta.ts
// Static metadata + helpers for the 2 CELPIP writing tasks.
// Mirrors speakingTaskMeta.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { WritingPrompt } from "@/lib/types";

export interface WritingTaskMeta {
  taskNumber: 1 | 2;
  label:      string;
  name:       string;
  taskType:   string;
  color:      string;
  bgGradient: string;
}

export const WRITING_TASK_META: WritingTaskMeta[] = [
  {
    taskNumber: 1,
    label:      "Task 1",
    name:       "Writing an Email",
    taskType:   "Email Format",
    color:      "text-emerald-400",
    bgGradient: "from-emerald-500/10 to-emerald-500/5",
  },
  {
    taskNumber: 2,
    label:      "Task 2",
    name:       "Writing an Opinion Essay",
    taskType:   "Opinion Essay",
    color:      "text-sky-400",
    bgGradient: "from-sky-500/10 to-sky-500/5",
  },
];

// ── Count helpers ─────────────────────────────────────────────────────────────

export interface WritingTaskCounts {
  total:     number;
  published: number;
  draft:     number;
  archived:  number;
}

export function countWritingByStatus(
  prompts: WritingPrompt[],
  taskNumber: number,
): WritingTaskCounts {
  const filtered = prompts.filter((p) => p.task_number === taskNumber);
  return {
    total:     filtered.length,
    published: filtered.filter((p) => p.status === "published").length,
    draft:     filtered.filter((p) => p.status === "draft" || !p.status).length,
    archived:  filtered.filter((p) => p.status === "archived").length,
  };
}
