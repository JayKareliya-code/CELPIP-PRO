"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingTaskGrid.tsx — 2-card responsive grid for the writing module home.
//
// Receives ALL active writing prompts from the server component.
// Groups them by task_number → renders ONE WritingTaskCard per task,
// mirroring how SpeakingModuleHome de-duplicates speaking prompts.
//
// The card href links to the task folder page /writing/<first-prompt-id>,
// which then shows the prompt list for that task.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo }          from "react";
import { WritingTaskCard }  from "@/components/writing/WritingTaskCard";
import type { WritingTask } from "@/lib/types";

// ── Task descriptions (shown on cards) ────────────────────────────────────────

const TASK_DESCRIPTIONS: Record<number, string> = {
  1: "Write a formal or informal email responding to a situation. Match the tone to the context and fulfill all the required points.",
  2: "Write an opinion essay presenting your view on a topic. Develop your argument with supporting ideas and a clear conclusion.",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingTaskGridProps {
  tasks: WritingTask[];
  /** Per-task attempts used — from useQuota("writing").writing_used_per_task */
  writingUsedPerTask?: Record<number, number>;
  /** Per-task limit from the user's plan (null = unlimited) */
  attemptsLimit: number | null;
  isLocked: boolean;
}

/**
 * Renders ONE card per task number (Task 1 + Task 2).
 *
 * All active prompts for a task are grouped together — the card shows
 * the prompt count and links to the task folder (/writing/<first-prompt-id>).
 * Multiple prompts per task are accessible from the folder page.
 */
export function WritingTaskGrid({
  tasks,
  writingUsedPerTask,
  attemptsLimit,
  isLocked,
}: WritingTaskGridProps) {

  // ── Group prompts by task_number ───────────────────────────────────────────
  const { uniqueTasks, promptCountByTask } = useMemo(() => {
    const counts: Record<number, number> = {};
    const firstPrompt: Record<number, WritingTask> = {};

    for (const t of tasks) {
      counts[t.task_number] = (counts[t.task_number] ?? 0) + 1;
      if (!firstPrompt[t.task_number]) firstPrompt[t.task_number] = t;
    }

    // One canonical entry per task_number, sorted by task_number
    const unique = Object.values(firstPrompt).sort(
      (a, b) => a.task_number - b.task_number,
    );

    return { uniqueTasks: unique, promptCountByTask: counts };
  }, [tasks]);

  // ── Fallback: show placeholder cards even with no DB data ─────────────────
  const taskNumbers: (1 | 2)[] =
    uniqueTasks.length > 0
      ? (uniqueTasks.map((t) => t.task_number) as (1 | 2)[])
      : [1, 2];

  if (!tasks.length) {
    return (
      <p className="text-subtle text-sm">No writing tasks available yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
      {taskNumbers.map((taskNum) => {
        const task        = uniqueTasks.find((t) => t.task_number === taskNum);
        const promptCount = promptCountByTask[taskNum] ?? 0;
        const used        = writingUsedPerTask?.[taskNum] ?? 0;
        const isBonusRetry =
          attemptsLimit !== null && used >= attemptsLimit && !isLocked;

        return (
          <WritingTaskCard
            key={taskNum}
            taskNumber={taskNum}
            title={task?.title ?? `Task ${taskNum}`}
            taskType={task?.task_type ?? (taskNum === 1 ? "email" : "opinion_essay")}
            timeLimitSecs={task?.time_limit_seconds ?? (taskNum === 1 ? 1620 : 1800)}
            minWords={task?.min_words ?? 150}
            maxWords={task?.max_words ?? 200}
            description={TASK_DESCRIPTIONS[taskNum] ?? ""}
            promptCount={promptCount}
            attemptsUsed={used}
            attemptsLimit={isLocked ? 0 : attemptsLimit}
            isBonusRetryMode={isBonusRetry}
            isLocked={isLocked}
            href={`/writing/${taskNum}`}
          />
        );
      })}
    </div>
  );
}
