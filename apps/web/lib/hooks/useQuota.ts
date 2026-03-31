// ─────────────────────────────────────────────────────────────────────────────
// useQuota.ts — Check remaining practice attempt quota for the current user
//
// Phase 1: derives quota from MOCK_USER and the plan limits in constants.ts.
// Phase 2: fetches GET /api/v1/users/me/quota — returns per-task can_attempt
//          maps so the UI knows exactly which tasks are still available.
//
// Usage:
//   const { canAttempt, remaining, showPaywall } = useQuota("speaking");
//   const { canAttemptTask }                     = useQuota("speaking");
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
      const totalUsed  = Object.values(usedMap).reduce((a, b) => a + b, 0);
      const remaining  = limit === null ? -1 : Math.max(0, limit - totalUsed);

      return {
        remaining,
        canAttempt,
        showPaywall:    !canAttempt,
        canAttemptTask: canAttemptMap,
      };
    },

    enabled:   USE_MOCK || !!user,
    staleTime: 60_000,
  });

  const fallback: QuotaStatus = { remaining: 0, canAttempt: false, showPaywall: false };
  return { ...(data ?? fallback), isLoading };
}
