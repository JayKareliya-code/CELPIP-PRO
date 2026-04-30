"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useDashboardStats.ts — Fetches data needed by dashboard status row
//
// Derives the latest completed band per skill from the history endpoint.
// Using a single hook here keeps the dashboard status row a dumb display
// component and all async logic in one place.
// ─────────────────────────────────────────────────────────────────────────────

import { useAuth }  from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { API_V1, api, authHeaders, USE_MOCK } from "@/lib/api";
import { roundBand }       from "@/lib/utils";
import type { PaginatedHistory } from "@/lib/types";

export interface DashboardStats {
  latestSpeakingBand: number | null;
  latestWritingBand:  number | null;
}

const MOCK_STATS: DashboardStats = {
  latestSpeakingBand: 7.5,
  latestWritingBand:  6.5,
};

export function useDashboardStats(): {
  data:      DashboardStats | undefined;
  isLoading: boolean;
} {
  const { getToken } = useAuth();

  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],

    queryFn: async (): Promise<DashboardStats> => {
      if (USE_MOCK) return MOCK_STATS;

      const token = await getToken();
      // Fetch last 20 to reliably find at least one per skill
      const history = await api.get<PaginatedHistory>(
        `${API_V1}/history?limit=20`,
        { headers: authHeaders(token) },
      );

      const latestFor = (skill: "speaking" | "writing"): number | null => {
        const raw = history.items.find(
          (a) => a.skill === skill && a.status === "complete" && a.estimated_band != null,
        )?.estimated_band ?? null;
        return raw !== null ? roundBand(raw) : null;
      };

      return {
        latestSpeakingBand: latestFor("speaking"),
        latestWritingBand:  latestFor("writing"),
      };
    },

    staleTime: 60_000, // 1 min — a new attempt invalidates via useHistory
  });
}
