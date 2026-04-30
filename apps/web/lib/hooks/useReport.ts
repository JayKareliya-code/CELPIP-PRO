"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useReport.ts — Fetch the full AI feedback report for a completed attempt
//
// GET /api/v1/attempts/{id}/report
// Always uses the real API — no mock fallback.
// Report is immutable once created — staleTime: Infinity avoids re-fetching.
// ─────────────────────────────────────────────────────────────────────────────

import { useAuth }  from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { API_V1, api, authHeaders } from "@/lib/api";
import type { ReportResponse } from "@/lib/types";

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseReportReturn {
  report:    ReportResponse | undefined;
  isLoading: boolean;
  isError:   boolean;
}

/**
 * Fetch the full AI feedback report for a completed attempt.
 *
 * Always hits the real API — reports are user-specific and must not be mocked.
 * Cached indefinitely (staleTime: Infinity) because reports are immutable.
 */
export function useReport(attemptId: string): UseReportReturn {
  const { getToken } = useAuth();

  const { data, isLoading, isError } = useQuery<ReportResponse>({
    queryKey: ["report", attemptId],

    queryFn: async () => {
      const token = await getToken();
      return api.get<ReportResponse>(
        `${API_V1}/attempts/${attemptId}/report`,
        { headers: authHeaders(token) },
      );
    },

    enabled: !!attemptId,
    staleTime: Infinity,  // reports are immutable — never re-fetch
    retry: 2,
  });

  return { report: data, isLoading, isError };
}
