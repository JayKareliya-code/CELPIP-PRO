// ─────────────────────────────────────────────────────────────────────────────
// useQuota.ts — Check remaining practice attempt quota for the current user
//
// Phase 1: derives quota from MOCK_USER and the plan limits in constants.ts.
// Phase 2: fetches GET /api/v1/users/me/quota — returns per-task can_attempt
//          maps so the UI knows exactly which tasks are still available.
//
// Usage:
//   const { canAttempt, remaining, showPaywall }       = useQuota("speaking");
//   const { canAttemptTask, speaking_used_per_task }   = useQuota("speaking");
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useAuth }   from "@clerk/nextjs";
import { useQuery }  from "@tanstack/react-query";
import { USE_MOCK, API_V1, api, authHeaders } from "@/lib/api";
import { MOCK_USER } from "@/lib/mockData";
import {
  STARTER_PLAN_LIMITS,
  PRO_PLAN_LIMITS,
  ULTRA_PLAN_LIMITS,
} from "@/lib/constants";
import type { Skill, UserPlan, QuotaStatusResponse } from "@/lib/types";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuotaStatus {
  /** Attempts remaining for this skill (-1 = unlimited). */
  remaining: number;
  /** True when the user has quota left to start a new attempt. */
  canAttempt: boolean;
  /** True when quota is exhausted — use this to show PaywallModal. */
  showPaywall: boolean;
  /**
   * Per-task can-attempt map from the backend.
   * e.g. { 1: true, 2: false, 3: true, ... }
   * undefined in mock mode.
   */
  canAttemptTask?: Record<number, boolean>;
  /**
   * Per-task USED count — raw from backend.
   * e.g. { 0: 1, 1: 3, 2: 0, ... }
   * Used by TaskAttemptRing and AttemptStatusBar.
   */
  speaking_used_per_task?: Record<number, number>;
  writing_used_per_task?: Record<number, number>;
  /** Per-task available addon credits — populated from backend addon_credits table. */
  speaking_addon_credits_per_task?: Record<number, number>;
  writing_addon_credits_per_task?: Record<number, number>;
  /** Plan baseline limit per task (null = unlimited). From backend get_plan_limits. */
  speaking_limit_per_task?: number | null;
  writing_limit_per_task?:  number | null;
  /** Mock test fields from backend quota response. */
  speaking_mock_tests_used?:    number;
  writing_mock_tests_used?:     number;
  speaking_mock_tests_limit?:   number | null;
  writing_mock_tests_limit?:    number | null;
  speaking_mock_addon_credits?: number;
  writing_mock_addon_credits?:  number;
}

// ── Mock quota resolver ────────────────────────────────────────────────────────

function getMockQuota(skill: Skill): QuotaStatus {
  const plan: UserPlan = MOCK_USER.plan;

  if (plan === "starter") {
    const limit = STARTER_PLAN_LIMITS.speaking_mock_tests;
    return { remaining: limit, canAttempt: true, showPaywall: false };
  }
  if (plan === "pro") {
    const limit =
      skill === "speaking"
        ? PRO_PLAN_LIMITS.speaking_attempts_per_task
        : PRO_PLAN_LIMITS.writing_attempts_per_task;
    return { remaining: limit, canAttempt: true, showPaywall: false };
  }
  if (plan === "ultra") {
    const limit =
      skill === "speaking"
        ? ULTRA_PLAN_LIMITS.speaking_attempts_per_task
        : ULTRA_PLAN_LIMITS.writing_attempts_per_task;
    return { remaining: limit, canAttempt: true, showPaywall: false };
  }
  return { remaining: 0, canAttempt: false, showPaywall: true };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the quota status for the given skill for the current user.
 *
 * Phase 1: computed from mock user + plan constants (no fetch).
 * Phase 2: fetches GET /api/v1/users/me/quota and derives canAttempt from the
 *          per-task `can_attempt_*` maps returned by the server.
 *
 * `showPaywall` is the primary flag — connect it to <PaywallModal open={showPaywall} />.
 */
export function useQuota(skill: Skill): QuotaStatus & { isLoading: boolean } {
  const { user }     = useCurrentUser();
  const { getToken } = useAuth();

  const { data, isLoading } = useQuery<QuotaStatus>({
    queryKey: ["quota", skill, user?.id],

    queryFn: async (): Promise<QuotaStatus> => {
      if (USE_MOCK || !user) return getMockQuota(skill);

      const token = await getToken();
      const resp  = await api.get<QuotaStatusResponse>(
        `${API_V1}/users/me/quota`,
        { headers: authHeaders(token) },
      );

      const canAttemptMap =
        skill === "speaking" ? resp.can_attempt_speaking : resp.can_attempt_writing;
      const canAttempt = Object.values(canAttemptMap).some(Boolean);

      const usedMap =
        skill === "speaking" ? resp.speaking_used_per_task : resp.writing_used_per_task;
      const limit =
        skill === "speaking" ? resp.speaking_limit_per_task : resp.writing_limit_per_task;

      // Per-task addon credits — used to compute accurate effectiveLimit per task.
      const addonMap =
        skill === "speaking"
          ? (resp.speaking_addon_credits_per_task ?? {})
          : (resp.writing_addon_credits_per_task  ?? {});

      // Sum remaining slots using the EFFECTIVE limit (plan + addons) per task.
      // This ensures users with purchased addon packs see accurate remaining counts.
      const remaining = limit === null
        ? -1
        : Object.entries(usedMap).reduce((sum, [taskKey, used]) => {
            const addonCredits  = addonMap[Number(taskKey)] ?? 0;
            const effectiveLimit = limit + addonCredits;
            return sum + Math.max(0, effectiveLimit - used);
          }, 0);

      return {
        remaining,
        canAttempt,
        showPaywall:    !canAttempt,
        canAttemptTask: canAttemptMap,
        // Expose per-task usage counts for attempt rings and bars
        speaking_used_per_task:
          skill === "speaking" ? resp.speaking_used_per_task : undefined,
        writing_used_per_task:
          skill === "writing"  ? resp.writing_used_per_task  : undefined,
        // Expose per-task addon credits so useSpeakingQuota can compute effectiveLimit
        speaking_addon_credits_per_task:
          skill === "speaking" ? resp.speaking_addon_credits_per_task : undefined,
        writing_addon_credits_per_task:
          skill === "writing"  ? resp.writing_addon_credits_per_task  : undefined,
        // Expose plan limits so consumers don't duplicate backend config values
        speaking_limit_per_task:
          skill === "speaking" ? resp.speaking_limit_per_task : undefined,
        writing_limit_per_task:
          skill === "writing"  ? resp.writing_limit_per_task  : undefined,
        // Mock test usage + limits + addon pool (forwarded for UsageTab)
        speaking_mock_tests_used:    resp.speaking_mock_tests_used,
        writing_mock_tests_used:     resp.writing_mock_tests_used,
        speaking_mock_tests_limit:   resp.speaking_mock_tests_limit,
        writing_mock_tests_limit:    resp.writing_mock_tests_limit,
        speaking_mock_addon_credits: resp.speaking_mock_addon_credits,
        writing_mock_addon_credits:  resp.writing_mock_addon_credits,
      };
    },

    enabled:            USE_MOCK || !!user,
    staleTime:          15_000,   // 15 s — refreshes quickly after a pack purchase
    refetchOnWindowFocus: true,   // re-fetch when user returns from /billing
  });

  const fallback: QuotaStatus = { remaining: 0, canAttempt: false, showPaywall: false };
  return { ...(data ?? fallback), isLoading };
}
