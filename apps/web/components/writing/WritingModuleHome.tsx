"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingModuleHome — Writing module home page.
//
// Layout mirrors SpeakingModuleHome exactly:
//   • Header strip with module title
//   • Context-aware banner:
//       - Starter → "2 free attempts" info + upgrade CTA
//       - Pro     → hidden
//   • Stats strip
//   • 2-col grid of WritingTaskCards (Task 1 + Task 2)
//
// Quota: Starter always gets 2 free writing attempts per task — tasks are
// NEVER locked by plan alone. Addon credits stack on top.
// ─────────────────────────────────────────────────────────────────────────────

import { PenLine, ArrowRight } from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav }         from "@/components/layout/BreadcrumbNav";
import { WritingTaskGrid }       from "@/components/writing/WritingTaskGrid";
import { useTaskModuleAccess }   from "@/lib/hooks/useTaskModuleAccess";
import { useWritingQuota }       from "@/lib/hooks/useWritingQuota";
import type { WritingTask }      from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingModuleHomeProps {
  tasks: WritingTask[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WritingModuleHome({ tasks }: WritingModuleHomeProps) {
  // useTaskModuleAccess provides addon credit info (hasAddonCredits, addonCreditsPerTask)
  // and the plan. We no longer use isModuleLocked — writing is always accessible.
  const access = useTaskModuleAccess("writing");

  // Plan-level quota for the stats strip (taskNumber=null → addonCredits=0,
  // effectiveLimit = planLimit only, which is correct for the overview tile).
  const { plan, effectiveLimit: planAttemptsLimit, isLoading } = useWritingQuota(null);

  const isStarter = plan === "starter";
  const isLoaded   = !access.isLoading && !isLoading;

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

      {/* ── Context-aware banner ─────────────────────────────────────────── */}

      {/* A: Starter → show plan limit + upgrade CTA */}
      {isStarter && (
        <div className="rounded-xl border border-amber-700/30 bg-amber-950/40 p-4 flex items-center gap-4 flex-wrap">
          <PenLine className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-200">
              {planAttemptsLimit} free attempts per task included with your Starter plan
            </p>
            <p className="text-xs text-amber-300/70 mt-0.5">
              Upgrade to Pro for 5 attempts per task, AI scoring, and mock tests.
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
      {isLoaded && (
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Tasks",
              value: "2",
              sub:   "Task 1 & 2",
            },
            {
              label: "Attempts / task",
              value: String(planAttemptsLimit),
              sub:   `Included in ${plan}`,
            },
            {
              label: "Redos",
              value: "Free",
              sub:   "Retry any completed prompt",
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
        addonCreditsPerTask={access.addonCreditsPerTask}
        planAttemptsLimit={planAttemptsLimit}
      />
    </div>
  );
}
