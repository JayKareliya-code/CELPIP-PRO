// ─────────────────────────────────────────────────────────────────────────────
// useQuota.ts — Module-level practice-quota snapshot for the current user
//
// Fetches GET /api/v1/users/me/quota once per user (the response carries every
// skill) and projects it down to a single skill via React Query's `select`.
// `useQuota("speaking")` and `useQuota("writing")` share one network request.
//
// SCOPE: the `canAttempt` / `showPaywall` flags here are MODULE-level — true
// when *any* task in the skill is still available, not a specific one. For
// per-task gating (a single task card or prompt page) use
// useSpeakingQuota(taskNumber) / useWritingQuota(taskNumber), which resolve
// effectiveLimit / used / remaining for one task.
//
// Usage:
//   const { canAttemptTask, speaking_used_per_task } = useQuota("speaking");
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useAuth }   from "@clerk/nextjs";
import { useQuery }  from "@tanstack/react-query";
import { USE_MOCK, API_V1, api, authHeaders } from "@/lib/api";
import { MOCK_USER } from "@/lib/mockData";
import { STARTER_PLAN_LIMITS, PRO_PLAN_LIMITS } from "@/lib/constants";
import type { Skill, QuotaStatusResponse } from "@/lib/types";
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
  /**
   * Single shared retry-credit pool. Spent on practice redoes (1 each) and
   * mock retakes (8 speaking / 2 writing). 0 for free plan users; granted
   * on Pro activation and topped up by add-on purchases.
   * `lifetime_granted` is the sum of every positive grant — denominator of
   * the "remaining / total" progress bar.
   */
  retry_credits_balance?:          number;
  retry_credits_lifetime_granted?: number;
}

// ── USE_MOCK quota resolver (dev mode, no backend) ────────────────────────────

function getMockQuota(skill: Skill): QuotaStatus {
  const limits = MOCK_USER.plan === "pro" ? PRO_PLAN_LIMITS : STARTER_PLAN_LIMITS;
  const remaining =
    skill === "speaking"
      ? limits.speaking_attempts_per_task
      : limits.writing_attempts_per_task;
  return { remaining, canAttempt: true, showPaywall: false };
}

// ── Per-skill projection of the full /me/quota response ───────────────────────

function selectSkillQuota(resp: QuotaStatusResponse, skill: Skill): QuotaStatus {
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

  // Sum remaining slots using the EFFECTIVE limit (plan + addons) per task, so
  // users with purchased addon packs see accurate remaining counts.
  const remaining = limit === null
    ? -1
    : Object.entries(usedMap).reduce((sum, [taskKey, used]) => {
        const addonCredits   = addonMap[Number(taskKey)] ?? 0;
        const effectiveLimit = limit + addonCredits;
        return sum + Math.max(0, effectiveLimit - used);
      }, 0);

  return {
    remaining,
    canAttempt,
    showPaywall:    !canAttempt,
    canAttemptTask: canAttemptMap,
    speaking_used_per_task:
      skill === "speaking" ? resp.speaking_used_per_task : undefined,
    writing_used_per_task:
      skill === "writing"  ? resp.writing_used_per_task  : undefined,
    speaking_addon_credits_per_task:
      skill === "speaking" ? resp.speaking_addon_credits_per_task : undefined,
    writing_addon_credits_per_task:
      skill === "writing"  ? resp.writing_addon_credits_per_task  : undefined,
    speaking_limit_per_task:
      skill === "speaking" ? resp.speaking_limit_per_task : undefined,
    writing_limit_per_task:
      skill === "writing"  ? resp.writing_limit_per_task  : undefined,
    speaking_mock_tests_used:    resp.speaking_mock_tests_used,
    writing_mock_tests_used:     resp.writing_mock_tests_used,
    speaking_mock_tests_limit:   resp.speaking_mock_tests_limit,
    writing_mock_tests_limit:    resp.writing_mock_tests_limit,
    speaking_mock_addon_credits: resp.speaking_mock_addon_credits,
    writing_mock_addon_credits:  resp.writing_mock_addon_credits,
    retry_credits_balance:          resp.retry_credits_balance,
    retry_credits_lifetime_granted: resp.retry_credits_lifetime_granted,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the module-level quota snapshot for `skill`.
 *
 * `canAttempt` / `showPaywall` are module-wide — true when *any* task in the
 * skill is available. For per-task enforcement use useSpeakingQuota /
 * useWritingQuota.
 */
export function useQuota(skill: Skill): QuotaStatus & { isLoading: boolean } {
  const { user }     = useCurrentUser();
  const { getToken } = useAuth();

  const { data, isLoading } = useQuery<QuotaStatusResponse | null, Error, QuotaStatus>({
    // Keyed only by user — the /me/quota response carries every skill, so the
    // speaking and writing hooks share a single fetch instead of issuing two.
    queryKey: ["quota", user?.id ?? "anonymous"],

    queryFn: async (): Promise<QuotaStatusResponse | null> => {
      if (USE_MOCK || !user) return null;
      const token = await getToken();
      return api.get<QuotaStatusResponse>(
        `${API_V1}/users/me/quota`,
        { headers: authHeaders(token) },
      );
    },

    // `select` runs per hook instance — speaking and writing project the same
    // cached response down to their own skill without re-fetching.
    select: (resp): QuotaStatus =>
      resp === null ? getMockQuota(skill) : selectSkillQuota(resp, skill),

    enabled:            USE_MOCK || !!user,
    staleTime:          15_000,   // 15 s — refreshes quickly after a pack purchase
    refetchOnWindowFocus: true,   // re-fetch when user returns from /billing
  });

  const fallback: QuotaStatus = { remaining: 0, canAttempt: false, showPaywall: false };
  return { ...(data ?? fallback), isLoading };
}
