"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useHistory.ts — Paginated attempt history for the authenticated user
//
// GET /api/v1/history?skill=<speaking|writing>&page=<n>&limit=10
// Previous page data stays visible while the next page loads (placeholderData).
// ─────────────────────────────────────────────────────────────────────────────

import { useAuth }  from "@clerk/nextjs";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { API_V1, api, authHeaders, USE_MOCK } from "@/lib/api";
import type { PaginatedHistory, HistoryItem, Skill } from "@/lib/types";

// ── Mock data ─────────────────────────────────────────────────────────────────

function buildMockHistory(skill: Skill | null, page: number): PaginatedHistory {
  const all: HistoryItem[] = [
    { attempt_id: "mock-001", skill: "speaking", task_number: 1, task_title: "Personal Experience",      is_mock_test: false, status: "complete", estimated_band: 8.5, created_at: new Date(Date.now() - 86400000 * 1).toISOString() },
    { attempt_id: "mock-002", skill: "writing",  task_number: 1, task_title: "Email: Complaint Letter",  is_mock_test: false, status: "complete", estimated_band: 7.0, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { attempt_id: "mock-003", skill: "speaking", task_number: 3, task_title: "Describing a Scene",       is_mock_test: false, status: "complete", estimated_band: 9.0, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    { attempt_id: "mock-004", skill: "writing",  task_number: 2, task_title: "Opinion Essay: Technology",is_mock_test: false, status: "complete", estimated_band: 6.5, created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
    { attempt_id: "mock-005", skill: "speaking", task_number: 5, task_title: "Predicting Outcomes",      is_mock_test: false, status: "failed",   estimated_band: null, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    { attempt_id: "mock-006", skill: "speaking", task_number: 2, task_title: "Giving Advice",            is_mock_test: false, status: "complete", estimated_band: 7.5, created_at: new Date(Date.now() - 86400000 * 6).toISOString() },
    { attempt_id: "mock-007", skill: "writing",  task_number: 1, task_title: "Email: Apology",           is_mock_test: false, status: "complete", estimated_band: 8.0, created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  ];

  const filtered = skill ? all.filter((a) => a.skill === skill) : all;
  const limit = 5;
  const offset = (page - 1) * limit;
  const items = filtered.slice(offset, offset + limit);

  return { items, total: filtered.length, page, limit, has_next: offset + limit < filtered.length };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseHistoryReturn {
  history:   PaginatedHistory | undefined;
  isLoading: boolean;
  isError:   boolean;
}

/**
 * Fetch paginated attempt history.
 *
 * @param skill  Optional skill filter — null means "all skills".
 * @param page   1-indexed page number (default: 1).
 */
export function useHistory(skill: Skill | null, page: number): UseHistoryReturn {
  const { getToken, userId, isSignedIn } = useAuth();

  const { data, isLoading, isError } = useQuery<PaginatedHistory>({
    // Scope by userId — see useCurrentUser for rationale.
    queryKey: ["history", userId ?? "anonymous", skill, page],

    queryFn: async () => {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 400));
        return buildMockHistory(skill, page);
      }
      const token = await getToken();
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (skill) params.set("skill", skill);
      return api.get<PaginatedHistory>(
        `${API_V1}/history?${params.toString()}`,
        { headers: authHeaders(token) },
      );
    },

    placeholderData: keepPreviousData,  // keep previous page visible while fetching next
    staleTime: 30_000,                  // 30 s — history changes infrequently
    enabled: USE_MOCK || (!!isSignedIn && !!userId),
  });

  return { history: data, isLoading, isError };
}
