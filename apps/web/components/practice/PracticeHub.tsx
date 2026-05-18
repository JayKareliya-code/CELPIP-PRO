"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PracticeHub — /practice landing page.
//
// Layout mirrors SpeakingModuleHome / WritingModuleHome exactly:
//   • Icon header + module title
//   • Upgrade banner (starter)
//   • Stats strip (non-starter)
//   • 2-col grid of PracticeSkillCards
// ─────────────────────────────────────────────────────────────────────────────

import { PlayCircle } from "lucide-react";
import { BreadcrumbNav }          from "@/components/layout/BreadcrumbNav";
import { PracticeSkillCard }      from "@/components/practice/PracticeSkillCard";
import { StarterUpsellCards }     from "@/components/upgrade/StarterUpsellCards";
import { RetryCreditsBanner }     from "@/components/retry-credits/RetryCreditsBanner";
import { usePracticeQuota }       from "@/lib/hooks/usePracticeQuota";
import { useCurrentUser }         from "@/lib/hooks/useCurrentUser";
import {
  PRO_PLAN_LIMITS,
} from "@/lib/constants";
import type { AppUser } from "@/lib/types";

const SKILLS = ["speaking", "writing"] as const;

interface PracticeHubProps {
  user: AppUser | null;
}

export function PracticeHub({ user: serverUser }: PracticeHubProps) {
  const { user: clientUser } = useCurrentUser();
  const user      = clientUser ?? serverUser;
  const plan      = user?.plan ?? "starter";
  const isStarter = plan === "starter";

  const { quota: speakingQuota, isLoading: loadingS } = usePracticeQuota("speaking");
  const { quota: writingQuota,  isLoading: loadingW } = usePracticeQuota("writing");

  const isLoading = loadingS || loadingW;
  const planLabel = plan === "pro" ? "Pro Plan" : "Starter Plan";

  // Total tests available across both skills
  const totalSpeaking = plan === "pro" ? PRO_PLAN_LIMITS.speaking_mock_tests : 1;
  const totalWriting  = plan === "pro" ? PRO_PLAN_LIMITS.writing_mock_tests  : 1;

  return (
    <div className="space-y-6">
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
              <PlayCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mock Tests</h1>
              <p className="text-sm text-subtle mt-0.5">
                Full-length timed mock exams · Speaking &amp; Writing · AI scored
              </p>
            </div>
          </div>

          {/* Retry credits banner */}
          <RetryCreditsBanner />
        </div>

        {/* Right column — upsell / stat cards */}
        <div className="min-w-0">
          <StarterUpsellCards module="mock" />
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.18]" />

      {/* ── Skill cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SKILLS.map((skill) => {
          const quota   = skill === "speaking" ? speakingQuota : writingQuota;
          const loading = skill === "speaking" ? loadingS : loadingW;

          if (loading || !quota) {
            return (
              <div
                key={skill}
                className="rounded-xl border border-white/[0.06] bg-surface h-[190px] animate-pulse"
              />
            );
          }

          return (
            <PracticeSkillCard
              key={skill}
              skill={skill}
              quota={quota}
              planLabel={planLabel}
              isLocked={false}
            />
          );
        })}
      </div>
    </div>
  );
}
