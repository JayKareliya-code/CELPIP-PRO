"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PracticeHub — /practice landing page.
//
// Orchestrator only — no business logic or inline styles.
// Uses usePracticeQuota for each skill and composes PracticeSkillCard.
// ─────────────────────────────────────────────────────────────────────────────

import { Zap }             from "lucide-react";
import { BreadcrumbNav }   from "@/components/layout/BreadcrumbNav";
import { PracticeSkillCard }  from "@/components/practice/PracticeSkillCard";
import { usePracticeQuota }   from "@/lib/hooks/usePracticeQuota";
import { useCurrentUser }     from "@/lib/hooks/useCurrentUser";
import { cn }                 from "@/lib/utils";
import type { AppUser }       from "@/lib/types";

// ── Plan chip ─────────────────────────────────────────────────────────────────

const PLAN_CHIP_CLASSES: Record<string, string> = {
  ultra:   "bg-amber-900/30 border-amber-700/40 text-amber-300",
  pro:     "bg-indigo-900/30 border-indigo-700/40 text-indigo-300",
  starter: "bg-white/5 border-white/10 text-white/40",
};

const PLAN_LABELS: Record<string, string> = {
  ultra:   "Ultra Plan",
  pro:     "Pro Plan",
  starter: "Starter Plan",
};

// ── Skill row —  defined once, iterated to avoid any copy-paste ───────────────

const SKILLS = ["speaking", "writing"] as const;

// ── Component ─────────────────────────────────────────────────────────────────

interface PracticeHubProps {
  /** Server-fetched user — may be null if API is down (graceful degradation). */
  user: AppUser | null;
}

export function PracticeHub({ user: serverUser }: PracticeHubProps) {
  // Client-side user is preferred (fresher plan info after upgrade)
  const { user: clientUser } = useCurrentUser();
  const user  = clientUser ?? serverUser;
  const plan  = user?.plan ?? "starter";

  const { quota: speakingQuota, isLoading: loadingS } = usePracticeQuota("speaking");
  const { quota: writingQuota,  isLoading: loadingW } = usePracticeQuota("writing");

  const planLabel  = PLAN_LABELS[plan]  ?? "Starter Plan";
  const chipClass  = PLAN_CHIP_CLASSES[plan] ?? PLAN_CHIP_CLASSES.starter;
  const isLoading  = loadingS || loadingW;

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Practice Tests</h1>
          <p className="text-sm text-subtle mt-1">
            Full-length timed tests — just like the real CELPIP exam.
          </p>
        </div>
        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border", chipClass)}>
          <Zap className="w-3 h-3" />
          {planLabel}
        </div>
      </div>

      {/* ── Skill cards ─────────────────────────────────────────────────────── */}
      <div className="flex justify-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {SKILLS.map((skill) => {
            const quota = skill === "speaking" ? speakingQuota : writingQuota;
            const loading = skill === "speaking" ? loadingS : loadingW;

            // Skeleton while loading
            if (loading || !quota) {
              return (
                <div
                  key={skill}
                  className="rounded-2xl border border-white/[0.06] bg-surface h-64 animate-pulse"
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
    </div>
  );
}
