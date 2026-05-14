"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SpeakingModuleHome — Redesigned speaking home page.
//
// Layout:
//   • Header strip with module title + plan badge
//   • Starter plan upgrade banner (when plan === "starter")
//   • 2-col grid of SpeakingTaskCard components (Practice + Tasks 1–8)
//
// Data:
//   • tasks: fetched server-side (one row per task_number, or multiple prompts)
//   • quota: fetched client-side via useQuota hook
//   • plan: from useCurrentUser
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { Mic } from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { SpeakingTaskCard } from "@/components/speaking/SpeakingTaskCard";
import { StarterUpsellCards } from "@/components/upgrade/StarterUpsellCards";
import { useSpeakingQuota } from "@/lib/hooks/useSpeakingQuota";
import { useQuota } from "@/lib/hooks/useQuota";
import { useTaskModuleAccess } from "@/lib/hooks/useTaskModuleAccess";
import {
  SPEAKING_TASK_TITLES,
  SPEAKING_TASK_DESCRIPTIONS,
} from "@/lib/speaking-constants";
import type { SpeakingTask } from "@/lib/types";

// TASK_TITLES and TASK_DESCRIPTIONS are now imported from @/lib/speaking-constants
// (single source of truth — no local duplicates).

// ── Props ─────────────────────────────────────────────────────────────────────

interface SpeakingModuleHomeProps {
  /**
   * All active speaking prompts from the DB (may contain multiple per task_number).
   * We group by task_number to count available prompts per task.
   */
  tasks: SpeakingTask[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SpeakingModuleHome({ tasks }: SpeakingModuleHomeProps) {
  // Plan-level quota (null taskNumber = overview mode).
  const {
    effectiveLimit: planAttemptsLimit,
    plan,
    isLoading,
  } = useSpeakingQuota(null);

  // Centralised access gate — single source of truth for locking logic.
  // Handles the "Starter + addon credits = unlocked" rule.
  const access = useTaskModuleAccess("speaking");

  // Full quota response — per-task USED counts (access hook only holds credits, not usage).
  const quotaResult = useQuota("speaking");

  const quotaReady = !isLoading && !access.isLoading;

  // Per-task addon credits map (task_number → available addon credits).
  const addonCreditsMap = access.addonCreditsPerTask;

  // Group prompts by task_number → count per task
  const promptCountByTask = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const t of tasks) {
      counts[t.task_number] = (counts[t.task_number] ?? 0) + 1;
    }
    return counts;
  }, [tasks]);

  // De-duplicate tasks → one canonical entry per task_number
  const uniqueTasks = useMemo(() => {
    const seen = new Set<number>();
    const result: SpeakingTask[] = [];
    // Sort by task_number so practice (0) comes first
    const sorted = [...tasks].sort((a, b) => a.task_number - b.task_number);
    for (const t of sorted) {
      if (!seen.has(t.task_number)) {
        seen.add(t.task_number);
        result.push(t);
      }
    }
    return result;
  }, [tasks]);

  // If DB has no data at all, produce placeholder cards for Tasks 1–8 only
  const taskNumbers = uniqueTasks.length > 0
    ? uniqueTasks.map((t) => t.task_number).filter((n) => n > 0)
    : [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <BreadcrumbNav />

      {/* ── Header row: title on left, upsell cards on right ──────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Speaking Module</h1>
            <p className="text-sm text-subtle mt-0.5">8 tasks | Tasks 1-8</p>
          </div>
        </div>

        {/* Upsell / stat cards — StarterUpsellCards handles both starter & pro */}
        <div className="flex-1 min-w-0 max-w-xl">
          <StarterUpsellCards module="speaking" />
        </div>
      </div>

      {/* ── Divider ────────────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.18]" />

      {/* ── Task grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {taskNumbers.map((taskNum) => {
          const task = uniqueTasks.find((t) => t.task_number === taskNum);
          const promptCount = promptCountByTask[taskNum] ?? 0;
          const used = quotaResult.speaking_used_per_task?.[taskNum] ?? 0;

          // Per-task effectiveLimit: planLimit + any addon credits for this specific task.
          // This means a custom_bundle for Task 4 only changes Task 4's limit,
          // while a speaking_pack (expanded to all tasks at webhook time) raises all.
          const taskAddonCredits = addonCreditsMap[taskNum] ?? 0;
          const taskEffectiveLimit = planAttemptsLimit + taskAddonCredits;

          return (
            <SpeakingTaskCard
              key={taskNum}
              taskNumber={taskNum === 0 ? "practice" : taskNum}
              title={SPEAKING_TASK_TITLES[taskNum] ?? (taskNum === 0 ? "Practice Task" : `Task ${taskNum}`)}
              description={SPEAKING_TASK_DESCRIPTIONS[taskNum] ?? ""}
              prepTimeSecs={task?.prep_time_seconds ?? 30}
              responseTimeSecs={task?.response_time_seconds ?? 60}
              difficulty={task?.difficulty ?? "medium"}
              hasParts={task?.has_parts ?? false}
              promptCount={promptCount}
              attemptsUsed={used}
              attemptsLimit={taskEffectiveLimit}
              isLocked={false}
              href={`/speaking/${taskNum}`}
            />
          );
        })}
      </div>
    </div>
  );
}
