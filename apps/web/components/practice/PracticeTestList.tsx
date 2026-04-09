"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PracticeTestList — /practice/[skill]
//
// Orchestrator only — no business logic or inline styles.
// Composes: PracticeQuotaBar, PracticeTestSlot, PracticeUpgradeCTA.
// ─────────────────────────────────────────────────────────────────────────────

import { useRouter }         from "next/navigation";
import { ChevronLeft }       from "lucide-react";
import { cn }                from "@/lib/utils";
import { BreadcrumbNav }     from "@/components/layout/BreadcrumbNav";
import { PracticeQuotaBar }   from "@/components/practice/PracticeQuotaBar";
import { PracticeTestSlot }   from "@/components/practice/PracticeTestSlot";
import { PracticeUpgradeCTA } from "@/components/practice/PracticeUpgradeCTA";
import { usePracticeQuota }   from "@/lib/hooks/usePracticeQuota";
import { useCurrentUser }     from "@/lib/hooks/useCurrentUser";
import { SKILL_META, MAX_PRACTICE_SLOTS } from "@/lib/practice/config";
import type { PracticeTestSlotData }      from "@/lib/practice/types";
import type { AppUser, Skill }            from "@/lib/types";

// ── Slot builder ──────────────────────────────────────────────────────────────

/**
 * Derives the full list of PracticeTestSlotData from quota numbers.
 * Up to MAX_PRACTICE_SLOTS rows are always shown so users can see what
 * unlocking more tests would give them.
 */
function buildSlots(limit: number, used: number): PracticeTestSlotData[] {
  return Array.from({ length: MAX_PRACTICE_SLOTS }, (_, i) => {
    const n = i + 1;
    return {
      slotNumber:  n,
      isUsed:      n <= used,
      isLocked:    n > limit,
      // TODO: populate estimatedBand and attemptId from history API (Phase 2)
      estimatedBand: undefined,
      attemptId:     undefined,
    };
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonSlot() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-surface h-[72px] animate-pulse" />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PracticeTestListProps {
  skill: Skill;
  /** Server-fetched user — may be null on API failure. */
  user:  AppUser | null;
}

export function PracticeTestList({ skill, user: serverUser }: PracticeTestListProps) {
  const router = useRouter();
  const { user: clientUser } = useCurrentUser();
  const user   = clientUser ?? serverUser;
  const plan   = user?.plan ?? "starter";

  const { quota, isLoading } = usePracticeQuota(skill);

  const meta       = SKILL_META[skill];
  const Icon       = meta.icon;
  const planLabel  = `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`;

  const slots       = quota ? buildSlots(quota.limit, quota.used) : [];
  const showUpgrade = quota ? quota.limit < MAX_PRACTICE_SLOTS : false;

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* ── Back button + header ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-subtle hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Practice
        </button>

        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0",
            meta.color.bg, meta.color.border, meta.color.text,
          )}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{meta.label}</h1>
            <p className="text-sm text-subtle mt-1">{meta.description}</p>
          </div>
        </div>
      </div>

      {/* ── Quota progress bar ───────────────────────────────────────────────── */}
      {isLoading || !quota ? (
        <div className="rounded-xl border border-white/[0.06] bg-surface h-14 animate-pulse" />
      ) : (
        <PracticeQuotaBar
          used={quota.used}
          limit={quota.limit}
          color={meta.color.ring}
          planLabel={planLabel}
        />
      )}

      {/* ── Test slot list ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Your practice tests
        </h2>

        <div className="space-y-2.5">
          {isLoading
            ? Array.from({ length: MAX_PRACTICE_SLOTS }).map((_, i) => (
                <SkeletonSlot key={i} />
              ))
            : slots.map((slot) => (
                <PracticeTestSlot
                  key={slot.slotNumber}
                  slot={slot}
                  skill={skill}
                  // TODO: replace with real practice session URL (Phase 2)
                  href={slot.isLocked ? undefined : `/speaking/0`}
                />
              ))}
        </div>

        {showUpgrade && !isLoading && (
          <PracticeUpgradeCTA skill={skill} />
        )}
      </div>
    </div>
  );
}
