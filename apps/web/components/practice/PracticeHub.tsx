"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PracticeHub — /practice landing page.
//
// Orchestrator only — no business logic or inline styles.
// Uses usePracticeQuota for each skill and composes PracticeSkillCard.
// ─────────────────────────────────────────────────────────────────────────────

import { BreadcrumbNav }   from "@/components/layout/BreadcrumbNav";
import { PracticeSkillCard }  from "@/components/practice/PracticeSkillCard";
import { usePracticeQuota }   from "@/lib/hooks/usePracticeQuota";
import { useCurrentUser }     from "@/lib/hooks/useCurrentUser";
import type { AppUser }       from "@/lib/types";


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

  const isLoading  = loadingS || loadingW;
  const planLabel  = plan === "ultra" ? "Ultra Plan" : plan === "pro" ? "Pro Plan" : "Starter Plan";

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Practice Tests</h1>
        <p className="text-sm text-subtle mt-1">
          Full-length timed tests — just like the real CELPIP exam.
        </p>
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
