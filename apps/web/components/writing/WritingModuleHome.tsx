"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingModuleHome — Writing module home page.
//
// Layout mirrors SpeakingModuleHome exactly:
//   • Header strip with module title
//   • Upsell / stat cards
//   • 2-col grid of WritingTaskCards (Task 1 + Task 2)
//
// Quota: Starter always gets 2 free writing attempts per task — tasks are
// NEVER locked by plan alone. Addon credits stack on top.
// ─────────────────────────────────────────────────────────────────────────────

import { PenLine } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { WritingTaskGrid } from "@/components/writing/WritingTaskGrid";
import { StarterUpsellCards } from "@/components/upgrade/StarterUpsellCards";
import { RetryCreditsBanner } from "@/components/retry-credits/RetryCreditsBanner";
import { useTaskModuleAccess } from "@/lib/hooks/useTaskModuleAccess";
import { useWritingQuota } from "@/lib/hooks/useWritingQuota";
import type { WritingTask } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingModuleHomeProps {
  tasks: WritingTask[];
}

// ── Full-page skeleton ────────────────────────────────────────────────────────
// Rendered while user/quota data is loading. Matches the exact layout of the
// real page so there is zero layout shift when data arrives.

function ModuleHomeSkeleton() {
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
              <div className="h-6 w-40 rounded-lg bg-white/[0.05] animate-pulse" />
              <div className="h-3.5 w-24 rounded bg-white/[0.04] animate-pulse" />
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

      {/* Task grid skeleton — 2 writing tasks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
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

export function WritingModuleHome({ tasks }: WritingModuleHomeProps) {
  const access = useTaskModuleAccess("writing");

  // Plan-level quota for the stats strip (taskNumber=null → overview).
  const { effectiveLimit: planAttemptsLimit, isLoading } = useWritingQuota(null);

  const isLoaded = !access.isLoading && !isLoading;

  // ── Full-page skeleton while loading ─────────────────────────────────────────
  // Render NOTHING real until both user and quota are resolved — prevents the
  // default-value flash and jarring partial-content state.
  if (!isLoaded) {
    return <ModuleHomeSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <BreadcrumbNav />

      {/* ── Header row: 2-column grid, equal-height columns ────────────────
          Left:  title block + retry-credits banner stacked vertically
          Right: upsell / stat cards
          items-stretch keeps the column heights aligned so the title + retry
          banner reads as a single cohesive panel matching the upsell cards. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Left column */}
        <div className="flex flex-col justify-between gap-3 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <PenLine className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Writing Module</h1>
              <p className="text-sm text-subtle mt-0.5">2 tasks | Tasks 1-2</p>
            </div>
          </div>

          {/* Retry credits banner */}
          <RetryCreditsBanner />
        </div>

        {/* Right column — upsell / stat cards */}
        <div className="min-w-0">
          <StarterUpsellCards module="writing" />
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.18]" />

      {/* ── Task grid ─────────────────────────────────────────────────────── */}
      <WritingTaskGrid
        tasks={tasks}
        addonCreditsPerTask={access.addonCreditsPerTask}
        planAttemptsLimit={planAttemptsLimit}
      />
    </div>
  );
}
