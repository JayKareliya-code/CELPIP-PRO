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
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { SpeakingTaskCard } from "@/components/speaking/SpeakingTaskCard";
import { StarterUpsellCards } from "@/components/upgrade/StarterUpsellCards";
import { RetryCreditsBanner } from "@/components/retry-credits/RetryCreditsBanner";
import { MicPermissionNotice } from "@/components/speaking/MicPermissionNotice";
import { useSpeakingQuota } from "@/lib/hooks/useSpeakingQuota";
import { useQuota } from "@/lib/hooks/useQuota";
import { useTaskModuleAccess } from "@/lib/hooks/useTaskModuleAccess";
import {
  SPEAKING_TASK_TITLES,
  SPEAKING_TASK_DESCRIPTIONS,
} from "@/lib/speaking-constants";
import type { SpeakingTask } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface SpeakingModuleHomeProps {
  tasks: SpeakingTask[];
}

// ── Full-page skeleton ────────────────────────────────────────────────────────
// Rendered while user/quota data is loading. Matches the exact layout of the
// real page so there is zero layout shift when data arrives.

function ModuleHomeSkeleton({ taskCount }: { taskCount: number }) {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <BreadcrumbNav />

      {/* Header row skeleton — 2-column grid with equal heights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Left: title + retry banner stacked */}
        <div className="flex flex-col justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.07] animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-44 rounded-lg bg-white/[0.05] animate-pulse" />
              <div className="h-3.5 w-28 rounded bg-white/[0.04] animate-pulse" />
            </div>
          </div>
          <div className="h-[56px] rounded-2xl border border-white/[0.07] bg-white/[0.03] animate-pulse" />
        </div>

        {/* Right: upsell cards — stack on phones to match the real component */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="h-[118px] rounded-2xl border border-white/[0.07] bg-white/[0.03] animate-pulse" />
          <div className="h-[118px] rounded-2xl border border-white/[0.07] bg-white/[0.03] animate-pulse" />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.18]" />

      {/* Task grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: taskCount }).map((_, i) => (
          <div
            key={i}
            className="h-36 rounded-2xl border border-white/[0.07] bg-white/[0.03] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
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
  const access = useTaskModuleAccess("speaking");

  // Full quota response — per-task USED counts.
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

  // ── Full-page skeleton while loading ─────────────────────────────────────────
  // Render NOTHING real until both user and quota are resolved — prevents the
  // "2/2 starter default" flash and the jarring partial-content state.
  if (!quotaReady) {
    return <ModuleHomeSkeleton taskCount={taskNumbers.length || 8} />;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <BreadcrumbNav />

      {/* Mic permission prompt — only renders when permission is not granted */}
      <MicPermissionNotice />

      {/* ── Header row: 2-column grid, equal-height columns ────────────────
          Left:  title block + retry-credits banner stacked vertically
          Right: upsell / stat cards
          items-stretch (grid default) keeps the column heights aligned so the
          title + retry banner reads as a single cohesive panel matching the
          upsell cards' height. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Left column */}
        <div className="flex flex-col justify-between gap-3 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Speaking Module</h1>
              <p className="text-sm text-subtle mt-0.5">8 tasks | Tasks 1-8</p>
            </div>
          </div>

          {/* Retry credits banner — sits below the title, stretches to match
              the upsell cards' height on the right. */}
          <RetryCreditsBanner />
        </div>

        {/* Right column — upsell / stat cards */}
        <div className="min-w-0">
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
