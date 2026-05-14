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

import { PenLine } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { WritingTaskGrid } from "@/components/writing/WritingTaskGrid";
import { StarterUpsellCards } from "@/components/upgrade/StarterUpsellCards";
import { useTaskModuleAccess } from "@/lib/hooks/useTaskModuleAccess";
import { useWritingQuota } from "@/lib/hooks/useWritingQuota";
import type { WritingTask } from "@/lib/types";

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
  const isLoaded = !access.isLoading && !isLoading;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <BreadcrumbNav />

      {/* ── Header row: title on left, upsell cards / stats on right ───────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <PenLine className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Writing Module</h1>
            <p className="text-sm text-subtle mt-0.5">2 tasks | Tasks 1-2</p>
          </div>
        </div>

        {/* Upsell / stat cards — StarterUpsellCards handles both starter & pro */}
        <div className="flex-1 min-w-0 max-w-xl">
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
