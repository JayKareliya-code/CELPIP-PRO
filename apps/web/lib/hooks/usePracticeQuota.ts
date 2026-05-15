// ─────────────────────────────────────────────────────────────────────────────
// lib/hooks/usePracticeQuota.ts
//
// Returns the mock-test quota for a given skill: plan allocation + purchased
// mock-bundle pool credits, minus mock sessions already used.
//
// Fetches GET /api/v1/users/me/quota. In USE_MOCK mode (or before the user
// loads) it falls back to the plan default from lib/practice/config.
// On API error it fails closed — the skill is reported as exhausted.
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

      // USE_MOCK / no backend — fall back to the plan default.
      if (USE_MOCK || !user) {
        return buildQuota(skill, limit, 0);
      }

      // Real API — effective limit = plan allocation + mock-bundle pool credits.
      try {
        const token = await getToken();
        const resp  = await api.get<QuotaStatusResponse>(
          `${API_V1}/users/me/quota`,
          { headers: authHeaders(token) },
        );

        const used =
          skill === "speaking"
            ? resp.speaking_mock_tests_used
            : resp.writing_mock_tests_used;

        // Effective limit = plan limit + purchased addon pool credits.
        const addonCredits =
          skill === "speaking"
            ? resp.speaking_mock_addon_credits
            : resp.writing_mock_addon_credits;

        const planLimit =
          skill === "speaking"
            ? (resp.speaking_mock_tests_limit ?? limit)
            : (resp.writing_mock_tests_limit  ?? limit);

        const effectiveLimit = planLimit + addonCredits;

        return buildQuota(skill, effectiveLimit, used);
      } catch {
        // API error: fail closed (safe default).
        return buildQuota(skill, limit, limit);
      }
    },

    enabled:   true, // runs even before user loads — returns plan defaults
    staleTime: 60_000,
    retry:     2,
  });

  return { quota: data, isLoading, error: error ?? null };
}
