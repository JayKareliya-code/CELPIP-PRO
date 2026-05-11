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
import { Mic, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav }        from "@/components/layout/BreadcrumbNav";
import { SpeakingTaskCard }    from "@/components/speaking/SpeakingTaskCard";
import { useSpeakingQuota }    from "@/lib/hooks/useSpeakingQuota";
import { useQuota }            from "@/lib/hooks/useQuota";
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

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Speaking Module</h1>
            <p className="text-sm text-subtle mt-0.5">
              8 tasks · Tasks 1–8 · Scored 1–12
            </p>
          </div>
        </div>

      </div>

      {/* ── Context-aware banner ─────────────────────────────────────── */}

      {/* A: Starter with NO addon credits → show plan info + upgrade CTA */}
      {access.plan === "starter" && !access.hasAddonCredits && (
        <div className="relative overflow-hidden rounded-xl border border-amber-700/40 bg-gradient-to-r from-amber-950/60 via-amber-950/40 to-yellow-950/40 p-4 flex items-center gap-4 flex-wrap">
          <div className="w-9 h-9 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <BookOpen className="w-4.5 h-4.5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-200">
              {planAttemptsLimit} free attempts per task included
            </p>
            <p className="text-xs text-amber-300/70 mt-0.5">
              Upgrade to Pro for 5 attempts per task, mock tests, and AI scoring.
            </p>
          </div>
          <Link
            href="/billing"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
          >
            Upgrade
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* B: Starter WITH addon credits → Speaking Pack active info */}
      {access.plan === "starter" && access.hasAddonCredits && (
        <div className="rounded-xl border border-primary/30 bg-primary/[0.07] p-4 flex items-center gap-4 flex-wrap">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary">Speaking Pack active</p>
            <p className="text-xs text-primary/70 mt-0.5">
              Your purchased credits are available. Use them any time.
            </p>
          </div>
          <Link
            href="/billing"
            className="shrink-0 text-xs text-primary/60 hover:text-primary transition-colors"
          >
            View billing →
          </Link>
        </div>
      )}

      {/* ── Task stats strip ──────────────────────────────────────────────────── */}
      {quotaReady && (
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Tasks",
              value: String(uniqueTasks.length),
              sub: `Practice + ${uniqueTasks.filter((t) => t.task_number > 0).length} scored`,
            },
            {
              label: "Attempts / task",
              value: String(planAttemptsLimit),
              sub: `Included in ${plan}`,
            },
            {
              label: "Redos",
              value: "Free",
              sub: "Retry any completed prompt",
            },
          ].map(({ label, value, sub }) => (
            <div
              key={label}
              className="rounded-xl border border-white/[0.07] bg-surface px-4 py-3"
            >
              <p className="text-lg font-bold text-foreground">{value}</p>
              <p className="text-xs font-medium text-subtle">{label}</p>
              <p className="text-[0.65rem] text-white/25 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Task grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {taskNumbers.map((taskNum) => {
          const task        = uniqueTasks.find((t) => t.task_number === taskNum);
          const promptCount = promptCountByTask[taskNum] ?? 0;
          const used        = quotaResult.speaking_used_per_task?.[taskNum] ?? 0;

          // Per-task effectiveLimit: planLimit + any addon credits for this specific task.
          // This means a custom_bundle for Task 4 only changes Task 4's limit,
          // while a speaking_pack (expanded to all tasks at webhook time) raises all.
          const taskAddonCredits   = addonCreditsMap[taskNum] ?? 0;
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
