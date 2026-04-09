// ─────────────────────────────────────────────────────────────────────────────
// lib/admin/speakingTaskMeta.ts
// Static metadata + helpers for the 8 CELPIP speaking tasks.
// ─────────────────────────────────────────────────────────────────────────────

import type { SpeakingPrompt } from "@/lib/types";

export interface TaskMeta {
  taskNumber: number;
  label:      string;
  name:       string;
  color:      string;
  bgGradient: string;
}

export const SPEAKING_TASK_META: TaskMeta[] = [
  { taskNumber: 1, label: "Task 1", name: "Giving Advice",                    color: "text-sky-400",    bgGradient: "from-sky-500/10 to-sky-500/5"     },
  { taskNumber: 2, label: "Task 2", name: "Talking about a Personal Exp.",    color: "text-violet-400", bgGradient: "from-violet-500/10 to-violet-500/5" },
  { taskNumber: 3, label: "Task 3", name: "Describing a Scene",               color: "text-emerald-400",bgGradient: "from-emerald-500/10 to-emerald-500/5"},
  { taskNumber: 4, label: "Task 4", name: "Making Predictions",               color: "text-amber-400",  bgGradient: "from-amber-500/10 to-amber-500/5"   },
  { taskNumber: 5, label: "Task 5", name: "Comparing and Persuading",         color: "text-rose-400",   bgGradient: "from-rose-500/10 to-rose-500/5"     },
  { taskNumber: 6, label: "Task 6", name: "Dealing with a Difficult Sit.",    color: "text-orange-400", bgGradient: "from-orange-500/10 to-orange-500/5"  },
  { taskNumber: 7, label: "Task 7", name: "Expressing Opinions",              color: "text-teal-400",   bgGradient: "from-teal-500/10 to-teal-500/5"     },
  { taskNumber: 8, label: "Task 8", name: "Describing an Unusual Situation",  color: "text-pink-400",   bgGradient: "from-pink-500/10 to-pink-500/5"     },
];

export interface TaskCounts {
  total:     number;
  published: number;
  draft:     number;
  archived:  number;
}

export function countByStatus(prompts: SpeakingPrompt[], taskNumber: number): TaskCounts {
  const filtered = prompts.filter((p) => p.task_number === taskNumber);
  return {
    total:     filtered.length,
    published: filtered.filter((p) => p.status === "published").length,
    draft:     filtered.filter((p) => p.status === "draft" || !p.status).length,
    archived:  filtered.filter((p) => p.status === "archived").length,
  };
}
