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
import { Mic, ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { SpeakingTaskCard } from "@/components/speaking/SpeakingTaskCard";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useQuota } from "@/lib/hooks/useQuota";
import {
  PRO_PLAN_LIMITS,
  ULTRA_PLAN_LIMITS,
} from "@/lib/constants";
import type { SpeakingTask } from "@/lib/types";

// ── Task metadata (descriptions shown on cards) ───────────────────────────────

const TASK_TITLES: Record<number, string> = {
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

const TASK_DESCRIPTIONS: Record<number, string> = {
  0: "Warm-up. Describe your daily routine or a familiar topic. No scoring.",
  1: "Give advice to a friend or colleague about a personal or professional situation.",
  2: "Share a personal story — an event, challenge, or memorable experience.",
  3: "Look at an image and describe what you see in detail.",
  4: "Look at an image and describe what will happen next.",
  5: "Compare two situations, state a preference, then persuade someone to choose the other.",
  6: "Handle a real-life scenario — leave a message, resolve a conflict, ask for help.",
  7: "Express and defend your opinion on a topical issue with clear reasoning.",
  8: "Describe an unusual scene, theorise a cause, and predict what happens next.",
};

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
  const { user } = useCurrentUser();
  const { speaking_used_per_task, isLoading: quotaLoading } =
    useQuota("speaking");

  const plan = user?.plan ?? "starter";
  const isStarter = plan === "starter";

  // Per-task attempt limits from plan
  const attemptsLimit: number | null =
    plan === "pro"
      ? PRO_PLAN_LIMITS.speaking_attempts_per_task
      : plan === "ultra"
        ? ULTRA_PLAN_LIMITS.speaking_attempts_per_task
        : null; // starter: locked anyway

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

      {/* ── Starter upgrade banner ─────────────────────────────────────────── */}
      {isStarter && (
        <div className="relative overflow-hidden rounded-xl border border-amber-700/40 bg-gradient-to-r from-amber-950/60 via-amber-950/40 to-yellow-950/40 p-4 flex items-center gap-4 flex-wrap">
          <div className="w-9 h-9 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <BookOpen className="w-4.5 h-4.5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-200">
              Unlock individual task practice
            </p>
            <p className="text-xs text-amber-300/70 mt-0.5">
              Starter plan includes 1 full speaking mock test. Upgrade to Pro or Ultra to
              practice each task individually and get AI scoring.
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

      {/* ── Task stats strip ───────────────────────────────────────────────── */}
      {!isStarter && !quotaLoading && (
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Tasks",
              value: "9",
              sub: "Practice + 1–8",
            },
            {
              label: "Attempts / task",
              value: attemptsLimit === null ? "∞" : String(attemptsLimit),
              sub: `Included in ${plan}`,
            },
            {
              label: "Bonus retries",
              value: "Unlimited",
              sub: "After quota used",
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
          const task = uniqueTasks.find((t) => t.task_number === taskNum);
          const promptCount = promptCountByTask[taskNum] ?? 0;
          const used = speaking_used_per_task?.[taskNum] ?? 0;
          const isBonusRetry =
            attemptsLimit !== null && used >= attemptsLimit && !isStarter;

          return (
            <SpeakingTaskCard
              key={taskNum}
              taskNumber={taskNum === 0 ? "practice" : taskNum}
              title={TASK_TITLES[taskNum] ?? (taskNum === 0 ? "Practice Task" : `Task ${taskNum}`)}
              description={TASK_DESCRIPTIONS[taskNum] ?? ""}
              prepTimeSecs={task?.prep_time_seconds ?? 30}
              responseTimeSecs={task?.response_time_seconds ?? 60}
              difficulty={task?.difficulty ?? "medium"}
              hasParts={task?.has_parts ?? false}
              promptCount={promptCount}
              attemptsUsed={used}
              attemptsLimit={isStarter ? 0 : attemptsLimit}
              isBonusRetryMode={isBonusRetry}
              isLocked={isStarter}
              href={`/speaking/${taskNum}`}
            />
          );
        })}
      </div>
    </div>
  );
}
