"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingModuleHome — Writing module home page.
//
// Layout mirrors SpeakingModuleHome exactly:
//   • Header strip with module title
//   • Starter plan upgrade banner (when plan === "starter")
//   • 3-stat info strip (Tasks, Attempts/task, Bonus retries)
//   • 2-col grid of WritingTaskCards (Task 1 + Task 2)
//
// Data:
//   • tasks: passed in from server component
//   • quota: from useQuota("writing")
//   • plan:  from useCurrentUser
// ─────────────────────────────────────────────────────────────────────────────

import { PenLine, ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav }   from "@/components/layout/BreadcrumbNav";
import { WritingTaskGrid } from "@/components/writing/WritingTaskGrid";
import { useCurrentUser }  from "@/lib/hooks/useCurrentUser";
import { useQuota }        from "@/lib/hooks/useQuota";
import {
  PRO_PLAN_LIMITS,
  ULTRA_PLAN_LIMITS,
} from "@/lib/constants";
import type { WritingTask } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingModuleHomeProps {
  tasks: WritingTask[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WritingModuleHome({ tasks }: WritingModuleHomeProps) {
  const { user } = useCurrentUser();
  const { writing_used_per_task, isLoading: quotaLoading } = useQuota("writing");

  const plan      = user?.plan ?? "starter";
  const isStarter = plan === "starter";

  // Per-task attempt limit from plan
  const attemptsLimit: number | null =
    plan === "pro"
      ? PRO_PLAN_LIMITS.writing_attempts_per_task
      : plan === "ultra"
        ? ULTRA_PLAN_LIMITS.writing_attempts_per_task
        : null; // starter: locked anyway

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <BreadcrumbNav />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <PenLine className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Writing Module</h1>
            <p className="text-sm text-subtle mt-0.5">
              2 tasks · Tasks 1–2 · Scored 1–12
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
              Starter plan includes 1 full writing mock test. Upgrade to Pro or Ultra to
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

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      {!isStarter && !quotaLoading && (
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Tasks",
              value: "2",
              sub:   "Task 1 & 2",
            },
            {
              label: "Attempts / task",
              value: attemptsLimit === null ? "∞" : String(attemptsLimit),
              sub:   `Included in ${plan}`,
            },
            {
              label: "Bonus retries",
              value: "Unlimited",
              sub:   "After quota used",
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
      <WritingTaskGrid
        tasks={tasks}
        writingUsedPerTask={writing_used_per_task}
        attemptsLimit={attemptsLimit}
        isLocked={isStarter}
      />
    </div>
  );
}
