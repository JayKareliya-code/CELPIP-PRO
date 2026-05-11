"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingTaskGrid.tsx — 2-card responsive grid for the writing module home.
//
// Receives ALL active writing prompts from the server component.
// Groups them by task_number → renders ONE WritingTaskCard per task.
//
// Locking: Writing tasks are NEVER locked — Starter users get 2 free attempts
// per task by default. The locked overlay on cards is only used when explicitly
// passed isLocked=true (currently never).
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo }          from "react";
import { WritingTaskCard }  from "@/components/writing/WritingTaskCard";
import { useQuota }         from "@/lib/hooks/useQuota";
import type { WritingTask } from "@/lib/types";

// ── Task titles + descriptions (shown on cards) ───────────────────────────────

const TASK_TITLES: Record<number, string> = {
  1: "Task 1 — Email",
  2: "Task 2 — Opinion Essay",
};

const TASK_DESCRIPTIONS: Record<number, string> = {
  1: "Write a formal or informal email responding to a situation. Match the tone to the context and fulfill all the required points.",
  2: "Write an opinion essay presenting your view on a topic. Develop your argument with supporting ideas and a clear conclusion.",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingTaskGridProps {
  tasks: WritingTask[];
  /**
   * Per-task available addon credits from useTaskModuleAccess.
   * Used to compute effectiveLimit = planLimit + taskAddonCredits per card.
   */
  addonCreditsPerTask: Record<number, number>;
  /** Plan baseline quota (no add-ons). From useWritingQuota(null).effectiveLimit */
  planAttemptsLimit: number;
}

/**
 * Renders ONE card per task number (Task 1 + Task 2).
 *
 * All active prompts for a task are grouped together — the card shows
 * the prompt count and links to the task folder (/writing/<task_number>).
 */
export function WritingTaskGrid({
  tasks,
  addonCreditsPerTask,
  planAttemptsLimit,
}: WritingTaskGridProps) {
  // Per-task used counts from the quota API.
  const quotaResult        = useQuota("writing");
  const writingUsedPerTask = quotaResult.writing_used_per_task ?? {};

  // ── Group prompts by task_number ───────────────────────────────────────────
  const { uniqueTasks, promptCountByTask } = useMemo(() => {
    const counts: Record<number, number> = {};
    const firstPrompt: Record<number, WritingTask> = {};

    for (const t of tasks) {
      counts[t.task_number] = (counts[t.task_number] ?? 0) + 1;
      if (!firstPrompt[t.task_number]) firstPrompt[t.task_number] = t;
    }

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
        const used        = writingUsedPerTask[taskNum] ?? 0;

        // Per-task effective limit: plan baseline + any addon credits for this task.
        const taskAddonCredits   = addonCreditsPerTask[taskNum] ?? 0;
        const taskEffectiveLimit = planAttemptsLimit + taskAddonCredits;

        return (
          <WritingTaskCard
            key={taskNum}
            taskNumber={taskNum}
            title={TASK_TITLES[taskNum] ?? `Task ${taskNum}`}
            taskType={task?.task_type ?? (taskNum === 1 ? "email" : "opinion_essay")}
            timeLimitSecs={task?.time_limit_seconds ?? (taskNum === 1 ? 1620 : 1800)}
            minWords={task?.min_words ?? 150}
            maxWords={task?.max_words ?? 200}
            description={TASK_DESCRIPTIONS[taskNum] ?? ""}
            promptCount={promptCount}
            attemptsUsed={used}
            attemptsLimit={taskEffectiveLimit}
            isLocked={false}
            href={`/writing/${taskNum}`}
          />
        );
      })}
    </div>
  );
}
