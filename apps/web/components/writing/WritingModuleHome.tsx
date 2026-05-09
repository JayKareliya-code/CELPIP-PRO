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
//   • quota: centralised via useWritingQuota — effectiveLimit = planLimit + addonCredits
//   • plan:  derived from useWritingQuota (no separate useCurrentUser needed)
// ─────────────────────────────────────────────────────────────────────────────

import { PenLine, ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav }    from "@/components/layout/BreadcrumbNav";
import { WritingTaskGrid }  from "@/components/writing/WritingTaskGrid";
import { useQuota }         from "@/lib/hooks/useQuota";
import { useWritingQuota }  from "@/lib/hooks/useWritingQuota";
import type { WritingTask } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingModuleHomeProps {
  tasks: WritingTask[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WritingModuleHome({ tasks }: WritingModuleHomeProps) {
  // Plan-level quota (null taskNumber = overview mode: effectiveLimit = planLimit only,
  // addonCredits = 0 because we can't sum across tasks here).
  const {
    effectiveLimit: attemptsLimit,
    plan,
    isLoading,
  } = useWritingQuota(null);

  // Full quota response — gives us per-task used counts AND per-task addon credits.
  const quotaResult  = useQuota("writing");
  const quotaLoading = quotaResult.isLoading;
  const isStarter    = plan === "starter";

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
              Starter plan includes 1 full writing mock test. Upgrade to Pro to
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
      {!isStarter && !quotaLoading && !isLoading && (
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Tasks",
              value: "2",
              sub:   "Task 1 & 2",
            },
            {
              label: "Attempts / task",
              value: String(attemptsLimit),
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
        writingUsedPerTask={quotaResult.writing_used_per_task}
        writingAddonCreditsPerTask={quotaResult.writing_addon_credits_per_task}
        planAttemptsLimit={attemptsLimit}
        isLocked={isStarter}
      />
    </div>
  );
}
