"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useExamResults — polls GET /api/v1/mock-exam/attempts/{sessionId}/results
// until all 8 tasks are scored, then writes band scores into the mock exam
// store via setTaskBand().
//
// Polling behaviour:
//   • Only activates when `sessionId` is non-empty.
//   • Polls every POLL_INTERVAL_MS (5 s).
//   • Stops automatically once `all_scored = true`.
//   • Also stops if the component unmounts.
//
// Design decisions:
//   • Uses React Query with `refetchInterval` — no manual setInterval.
//   • Does NOT use USE_MOCK guard; in dev the band stays "—" until a real
//     worker runs.  Use USE_MOCK in the parent to skip mounting this hook.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect }         from "react";
import { useQuery }          from "@tanstack/react-query";
import { useAuth }           from "@clerk/nextjs";
import { API_V1, api, authHeaders } from "@/lib/api";
import { useMockExamStore }  from "@/store/mockExamStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaskResultItem {
  task_number:    number;
  status:         "pending" | "processing" | "complete" | "failed";
  estimated_band: number | null;
}

interface SessionResultsResponse {
  session_id: string;
  tasks:      TaskResultItem[];
  all_scored: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useExamResults(sessionId: string): void {
  const { getToken }    = useAuth();
  const { setTaskBand } = useMockExamStore();

  const { data } = useQuery<SessionResultsResponse>({
    queryKey: ["exam-results", sessionId],
    enabled:  Boolean(sessionId),

    queryFn: async () => {
      const token = await getToken();
      return api.get<SessionResultsResponse>(
        `${API_V1}/mock-exam/attempts/${sessionId}/results`,
        { headers: authHeaders(token) },
      );
    },

    // Poll every 5 s while there are still pending/processing tasks.
    // React Query stops refetching once refetchInterval returns false.
    refetchInterval: (query: { state: { data?: SessionResultsResponse } }) => {
      const d = query.state.data;
      if (!d || d.all_scored) return false;
      return POLL_INTERVAL_MS;
    },

    // Keep showing the last known data while re-fetching
    staleTime:                  0,
    refetchOnMount:             true,
    refetchIntervalInBackground: false,
    refetchOnReconnect:         true,
  });

  // Whenever the query returns new data, write any newly scored bands into the
  // mock exam store so ExamCompleteScreen reactively updates.
  useEffect(() => {
    if (!data?.tasks) return;
    for (const task of data.tasks) {
      if (task.estimated_band != null) {
        setTaskBand(task.task_number, task.estimated_band);
      }
    }
  }, [data, setTaskBand]);
}
