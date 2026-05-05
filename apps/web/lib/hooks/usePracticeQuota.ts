// ─────────────────────────────────────────────────────────────────────────────
// lib/hooks/usePracticeQuota.ts
//
// Custom hook: returns quota status for a given skill.
//
// Architecture:
//  • Phase 1 (now):  reads plan from the app user, computes quota from
//                    constants. No API call — `used` is always 0 until
//                    attempt history is wired.
//  • Phase 2 (TODO): swap `queryFn` body to call
//                    GET /api/v1/users/me/quota and read
//                    `speaking_used_per_task` / `writing_used_per_task`.
//
// The hook signature and return type never change between phases.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useAuth }  from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { USE_MOCK, API_V1, api, authHeaders } from "@/lib/api";
import { useCurrentUser }  from "@/lib/hooks/useCurrentUser";
import { getPlanMockLimit } from "@/lib/practice/config";
import type { PracticeQuota } from "@/lib/practice/types";
import type { Skill, QuotaStatusResponse } from "@/lib/types";

// ── Internal builder ──────────────────────────────────────────────────────────

function buildQuota(skill: Skill, limit: number, used: number): PracticeQuota {
  return {
    skill,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    exhausted: used >= limit,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the practice mock-test quota for the given skill.
 *
 * @param skill  "speaking" | "writing"
 * @returns      { quota: PracticeQuota | undefined, isLoading, error }
 */
export function usePracticeQuota(skill: Skill): {
  quota:     PracticeQuota | undefined;
  isLoading: boolean;
  error:     Error | null;
} {
  const { user }     = useCurrentUser();
  const { getToken } = useAuth();

  const { data, isLoading, error } = useQuery<PracticeQuota, Error>({
    queryKey: ["practiceQuota", skill, user?.id],

    queryFn: async (): Promise<PracticeQuota> => {
      const plan  = user?.plan ?? "starter";
      const limit = getPlanMockLimit(plan, skill);

      // ── Phase 1: mock / no backend ────────────────────────────────────────
      if (USE_MOCK || !user) {
        return buildQuota(skill, limit, 0);
      }

      // ── Phase 2: real API ─────────────────────────────────────────────────
      // Fetches the full quota response and reads mock_tests_used if available.
      // Falls back to 0 used until the backend returns this field.
      try {
        const token = await getToken();
        const resp  = await api.get<QuotaStatusResponse & {
          speaking_mock_tests_used?: number;
          writing_mock_tests_used?:  number;
        }>(
          `${API_V1}/users/me/quota`,
          { headers: authHeaders(token) },
        );

        const used =
          skill === "speaking"
            ? (resp.speaking_mock_tests_used ?? 0)
            : (resp.writing_mock_tests_used  ?? 0);

        return buildQuota(skill, limit, used);
      } catch {
        // API error: fail closed (safe default) so a user who has exhausted their
        // quota cannot start a session that will 402 at submission time.
        // The caller can detect this via isLoading===false + error being non-null
        // if React Query surfaces the error instead of returning stale data.
        return buildQuota(skill, limit, limit);
      }
    },

    enabled:   true, // runs even before user loads — returns plan defaults
    staleTime: 60_000,
    retry:     2,
  });

  return { quota: data, isLoading, error: error ?? null };
}
