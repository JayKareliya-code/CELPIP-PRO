"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useTaskScoreHistory.ts — Fetch recent band scores for the same skill+task
//
// GET /api/v1/history/task-scores?skill=&task_number=&limit=10
//
// Used by ScoreProgressCard to compute a score delta and render a trend line.
// Disabled when skill or taskNumber is missing (e.g. before report loads).
// ─────────────────────────────────────────────────────────────────────────────

import { useAuth }  from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { API_V1, api, authHeaders, USE_MOCK } from "@/lib/api";
import type { TaskScoreHistory, Skill } from "@/lib/types";

// ── Mock data ─────────────────────────────────────────────────────────────────

function buildMockScoreHistory(skill: Skill, taskNumber: number): TaskScoreHistory {
  const now = Date.now();
  const day = 86_400_000;
  return {
    skill,
    task_number: taskNumber,
    scores: [
      { attempt_id: "mock-h1", estimated_band: 6.5, completed_at: new Date(now - day * 6).toISOString(), dimensions: [
        { dimension: "coherence",    score: 7,  max_score: 12 },
        { dimension: "fluency",      score: 6,  max_score: 12 },
        { dimension: "grammar",      score: 6,  max_score: 12 },
        { dimension: "task",         score: 7,  max_score: 12 },
        { dimension: "vocabulary",   score: 7,  max_score: 12 },
      ]},
      { attempt_id: "mock-h2", estimated_band: 7.0, completed_at: new Date(now - day * 4).toISOString(), dimensions: [
        { dimension: "coherence",    score: 7,  max_score: 12 },
        { dimension: "fluency",      score: 7,  max_score: 12 },
        { dimension: "grammar",      score: 6,  max_score: 12 },
        { dimension: "task",         score: 8,  max_score: 12 },
        { dimension: "vocabulary",   score: 7,  max_score: 12 },
      ]},
    ],
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseTaskScoreHistoryReturn {
  data:      TaskScoreHistory | undefined;
  isLoading: boolean;
  isError:   boolean;
}

/**
 * Fetch the last `limit` completed band scores for a specific skill+task_number.
 *
 * Returns { data: undefined } when the query is disabled (no skill/taskNumber).
 * staleTime: 60s — a new attempt just scored may not appear immediately, which
 * is acceptable since this is a historical trend, not real-time data.
 *
 * @param skill       "speaking" | "writing" | null
 * @param taskNumber  0–8 speaking; 1–2 writing; null to disable
 * @param limit       max data points to return (1–10, default 10)
 */
export function useTaskScoreHistory(
  skill: Skill | null,
  taskNumber: number | null,
  limit = 10,
): UseTaskScoreHistoryReturn {
  const { getToken } = useAuth();

  const enabled = !!skill && taskNumber !== null;

  const { data, isLoading, isError } = useQuery<TaskScoreHistory>({
    queryKey: ["task-score-history", skill, taskNumber, limit],

    queryFn: async () => {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 300));
        return buildMockScoreHistory(skill!, taskNumber!);
      }
      const token  = await getToken();
      const params = new URLSearchParams({
        skill:       skill!,
        task_number: String(taskNumber),
        limit:       String(limit),
      });
      return api.get<TaskScoreHistory>(
        `${API_V1}/history/task-scores?${params.toString()}`,
        { headers: authHeaders(token) },
      );
    },

    enabled,
    staleTime: 60_000,   // 1 min — trend data is not time-critical
    retry: 1,
  });

  return { data, isLoading, isError };
}
