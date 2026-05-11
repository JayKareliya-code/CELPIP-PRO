"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PracticeTestList — /practice/[skill]
//
// Layout mirrors SpeakingModuleHome / WritingModuleHome:
//   • Icon header + skill title + subtitle
//   • Stats strip (non-starter)
//   • Section label + slot list
//   • Upgrade CTA when below Ultra limit
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

function buildSlots(limit: number, used: number): PracticeTestSlotData[] {
  return Array.from({ length: MAX_PRACTICE_SLOTS }, (_, i) => {
    const n = i + 1;
    return {
      slotNumber:    n,
      isUsed:        n <= used,
      isLocked:      n > limit,
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
  user:  AppUser | null;
}

export function PracticeTestList({ skill, user: serverUser }: PracticeTestListProps) {
  const router = useRouter();
  const { user: clientUser } = useCurrentUser();
  const user   = clientUser ?? serverUser;
  const plan   = user?.plan ?? "starter";

  const { quota, isLoading } = usePracticeQuota(skill);

  const meta      = SKILL_META[skill];
  const Icon      = meta.icon;
  const planLabel = `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`;

  const slots       = quota ? buildSlots(quota.limit, quota.used) : [];
  const showUpgrade = quota ? quota.limit < MAX_PRACTICE_SLOTS : false;

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* ── Back + Header ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-subtle hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Mock Tests
        </button>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-11 h-11 rounded-xl border flex items-center justify-center shrink-0",
              meta.color.bg, meta.color.border, meta.color.text,
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{meta.label}</h1>
            <p className="text-sm text-subtle mt-0.5">{meta.description}</p>
          </div>
        </div>
      </div>

      {/* ── Quota progress bar ────────────────────────────────────────────── */}
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

      {/* ── Test slot list ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Your mock tests
        </h2>

        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: MAX_PRACTICE_SLOTS }).map((_, i) => (
                <SkeletonSlot key={i} />
              ))
            : slots.map((slot) => (
                <PracticeTestSlot
                  key={slot.slotNumber}
                  slot={slot}
                  skill={skill}
                  href={slot.isLocked ? undefined : `/mock-test/${skill}/${slot.slotNumber}`}
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
