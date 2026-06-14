"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useMockExamHistory.ts — Fetch paginated mock exam session history
//
// GET /api/v1/history/mock-exams?page=<n>&limit=10
// ─────────────────────────────────────────────────────────────────────────────

import { useAuth }                        from "@clerk/nextjs";
import { useQuery, keepPreviousData }     from "@tanstack/react-query";
import { API_V1, api, authHeaders, USE_MOCK } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MockExamTaskResult {
  task_number:    number;
  status:         "pending" | "processing" | "complete" | "failed";
  estimated_band: number | null;
}

export interface MockExamSession {
  session_id:     string;
  skill:          "speaking" | "writing";
  tasks:          MockExamTaskResult[];
  avg_band:       number | null;
  tasks_complete: number;
  tasks_total:    number;
  created_at:     string;
}

export interface PaginatedMockExamHistory {
  items:    MockExamSession[];
  total:    number;
  page:     number;
  limit:    number;
  has_next: boolean;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

function buildMockData(page: number): PaginatedMockExamHistory {
  const makeTasks = (bands: (number | null)[]): MockExamTaskResult[] =>
    bands.map((b, i) => ({
      task_number:    i + 1,
      status:         b !== null ? "complete" : "pending",
      estimated_band: b,
    }));

  const sessions: MockExamSession[] = [
    {
      session_id:     "mock-session-001",
      skill:          "speaking",
      tasks:          makeTasks([7.5, 8.0, 6.5, 7.0, 8.5, 6.0, 7.5, 8.0]),
      avg_band:       7.4,
      tasks_complete: 8,
      tasks_total:    8,
      created_at:     new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      session_id:     "mock-session-002",
      skill:          "writing",
      tasks:          makeTasks([8.0, 9.0]),
      avg_band:       8.5,
      tasks_complete: 2,
      tasks_total:    2,
      created_at:     new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ];

  const limit = 5;
  const offset = (page - 1) * limit;
  return {
    items:    sessions.slice(offset, offset + limit),
    total:    sessions.length,
    page,
    limit,
    has_next: offset + limit < sessions.length,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMockExamHistory(page: number) {
  const { getToken, userId, isSignedIn } = useAuth();

  const { data, isLoading, isError } = useQuery<PaginatedMockExamHistory>({
    // Scope by userId — see useCurrentUser for rationale.
    queryKey: ["mock-exam-history", userId ?? "anonymous", page],

    queryFn: async () => {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 400));
        return buildMockData(page);
      }
      const token  = await getToken();
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      return api.get<PaginatedMockExamHistory>(
        `${API_V1}/history/mock-exams?${params.toString()}`,
        { headers: authHeaders(token) },
      );
    },

    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: USE_MOCK || (!!isSignedIn && !!userId),
  });

  return { sessions: data, isLoading, isError };
}
