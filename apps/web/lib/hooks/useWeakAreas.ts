"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useWeakAreas.ts — Fetches /api/v1/users/me/weak-areas
// ─────────────────────────────────────────────────────────────────────────────

import { useAuth }  from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { API_V1, api, authHeaders, USE_MOCK } from "@/lib/api";
import type { WeakAreaItem } from "@/lib/types";

const MOCK_WEAK_AREAS: WeakAreaItem[] = [
  { dimension: "fluency",       label: "Fluency & Pronunciation", avg_score: 5.8, attempt_count: 4 },
  { dimension: "grammar",       label: "Grammatical Accuracy",    avg_score: 6.2, attempt_count: 4 },
  { dimension: "coherence",     label: "Coherence & Cohesion",    avg_score: 6.5, attempt_count: 4 },
];

export function useWeakAreas(): {
  items:     WeakAreaItem[];
  isLoading: boolean;
} {
  const { getToken, userId, isSignedIn } = useAuth();

  const { data, isLoading } = useQuery<WeakAreaItem[]>({
    // Scope by userId — see useCurrentUser for rationale.
    queryKey: ["weak-areas", userId ?? "anonymous"],

    queryFn: async (): Promise<WeakAreaItem[]> => {
      if (USE_MOCK) return MOCK_WEAK_AREAS;
      const token = await getToken();
      return api.get<WeakAreaItem[]>(
        `${API_V1}/users/me/weak-areas`,
        { headers: authHeaders(token) },
      );
    },

    staleTime: 5 * 60_000, // 5 min — aggregated data changes slowly
    enabled: USE_MOCK || (!!isSignedIn && !!userId),
  });

  return { items: data ?? [], isLoading };
}
