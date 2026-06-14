"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useProgressData.ts — Aggregate per-task progress stats for /progress page
//
// Pulls a single history list (limit=30) and derives all needed metrics:
//   - per-task attempt count, best band, avg band, score series (for sparklines)
//   - overview stats (total attempts, overall best/avg, trend direction)
//   - recent 5 attempts (for the feed at the bottom)
//
// No new API endpoints required — everything is computed client-side from
// the existing GET /api/v1/history endpoint.
// ─────────────────────────────────────────────────────────────────────────────

import { useAuth }  from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { API_V1, api, authHeaders, USE_MOCK } from "@/lib/api";
import type { PaginatedHistory, HistoryItem, Skill } from "@/lib/types";

// ── Public types ──────────────────────────────────────────────────────────────

export interface TaskProgressStat {
  task_number:   number;
  attempt_count: number;
  best_band:     number | null;
  avg_band:      number | null;
  /** Ordered oldest → newest, only completed attempts with a band score. */
  scores:        number[];
  /** Based on comparing last score vs first score in the series. */
  trend:         "up" | "down" | "steady" | "none";
}

export interface OverviewStats {
  total_attempts: number;
  /** Best band across all tasks for this skill. */
  best_band:      number | null;
  /** Mean band across all scored attempts. */
  avg_band:       number | null;
  /** Compares the most recent 3 scores to the oldest 3 scores (when ≥ 4 attempts). */
  overall_trend:  "up" | "down" | "steady" | "none";
}

export interface UseProgressDataReturn {
  taskStats:     Map<number, TaskProgressStat>;
  overviewStats: OverviewStats;
  recentItems:   HistoryItem[];
  isLoading:     boolean;
  isError:       boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeTrend(scores: number[]): "up" | "down" | "steady" | "none" {
  if (scores.length < 2) return "none";
  const first = scores[0];
  const last  = scores[scores.length - 1];
  const delta = last - first;
  if (delta >  0.4) return "up";
  if (delta < -0.4) return "down";
  return "steady";
}

/** Build per-task and overview stats from a flat list of history items. */
function deriveStats(
  items: HistoryItem[],
  skill: Skill,
): { taskStats: Map<number, TaskProgressStat>; overview: OverviewStats } {
  // Only look at completed items for this skill with a band score
  const scored = items.filter(
    (it) => it.skill === skill && it.status === "complete" && it.estimated_band != null,
  );

  // Group by task_number — preserve insertion order (newest first from API)
  const byTask = new Map<number, HistoryItem[]>();
  for (const item of scored) {
    const arr = byTask.get(item.task_number) ?? [];
    arr.push(item);
    byTask.set(item.task_number, arr);
  }

  const taskStats = new Map<number, TaskProgressStat>();

  for (const [taskNum, taskItems] of Array.from(byTask.entries())) {
    // Reverse so oldest → newest for sparkline rendering
    const chronological = [...taskItems].reverse();
    const scores = chronological.map((it) => it.estimated_band!);

    const best = Math.max(...scores);
    const avg  = scores.reduce((s, v) => s + v, 0) / scores.length;

    taskStats.set(taskNum, {
      task_number:   taskNum,
      attempt_count: taskItems.length,
      best_band:     best,
      avg_band:      Math.round(avg * 10) / 10,
      scores,
      trend:         computeTrend(scores),
    });
  }

  // All completed (including skills with 0 tasks attempted — totals across skill)
  const skillAll = items.filter((it) => it.skill === skill && it.status === "complete");
  const allScores = scored.map((it) => it.estimated_band!);

  const overallBest = allScores.length > 0 ? Math.max(...allScores) : null;
  const overallAvg  = allScores.length > 0
    ? Math.round((allScores.reduce((s, v) => s + v, 0) / allScores.length) * 10) / 10
    : null;

  // Use the most recent 30 scored attempts (already capped at 30 by API) in chronological order
  const chronoAllScores = [...allScores].reverse();
  const overallTrend    = computeTrend(chronoAllScores);

  const overview: OverviewStats = {
    total_attempts: skillAll.length,
    best_band:      overallBest,
    avg_band:       overallAvg,
    overall_trend:  overallTrend,
  };

  return { taskStats, overview };
}

// ── Mock data ─────────────────────────────────────────────────────────────────

function buildMockHistory(skill: Skill): PaginatedHistory {
  const day = 86_400_000;
  const now = Date.now();

  const speaking: HistoryItem[] = [
    { attempt_id: "p-s1a", skill: "speaking", task_number: 1, task_title: "Giving Advice",             is_mock_test: false, status: "complete", estimated_band: 6.5, created_at: new Date(now - day * 12).toISOString() },
    { attempt_id: "p-s1b", skill: "speaking", task_number: 1, task_title: "Giving Advice",             is_mock_test: false, status: "complete", estimated_band: 7.0, created_at: new Date(now - day * 8).toISOString()  },
    { attempt_id: "p-s1c", skill: "speaking", task_number: 1, task_title: "Giving Advice",             is_mock_test: false, status: "complete", estimated_band: 7.5, created_at: new Date(now - day * 2).toISOString()  },
    { attempt_id: "p-s2a", skill: "speaking", task_number: 2, task_title: "Personal Experience",       is_mock_test: false, status: "complete", estimated_band: 8.0, created_at: new Date(now - day * 10).toISOString() },
    { attempt_id: "p-s2b", skill: "speaking", task_number: 2, task_title: "Personal Experience",       is_mock_test: false, status: "complete", estimated_band: 8.5, created_at: new Date(now - day * 4).toISOString()  },
    { attempt_id: "p-s3a", skill: "speaking", task_number: 3, task_title: "Describing a Scene",        is_mock_test: false, status: "complete", estimated_band: 9.0, created_at: new Date(now - day * 7).toISOString()  },
    { attempt_id: "p-s4a", skill: "speaking", task_number: 4, task_title: "Making Predictions",        is_mock_test: false, status: "complete", estimated_band: 7.0, created_at: new Date(now - day * 5).toISOString()  },
    { attempt_id: "p-s4b", skill: "speaking", task_number: 4, task_title: "Making Predictions",        is_mock_test: false, status: "complete", estimated_band: 7.5, created_at: new Date(now - day * 1).toISOString()  },
    { attempt_id: "p-s5a", skill: "speaking", task_number: 5, task_title: "Comparing & Persuading",    is_mock_test: false, status: "complete", estimated_band: 6.0, created_at: new Date(now - day * 9).toISOString()  },
    { attempt_id: "p-s6a", skill: "speaking", task_number: 6, task_title: "Difficult Situation",       is_mock_test: false, status: "complete", estimated_band: 8.0, created_at: new Date(now - day * 6).toISOString()  },
    { attempt_id: "p-s7a", skill: "speaking", task_number: 7, task_title: "Expressing Opinions",       is_mock_test: false, status: "complete", estimated_band: 7.5, created_at: new Date(now - day * 3).toISOString()  },
    // Task 8 intentionally untried — tests empty-state card
  ];

  const writing: HistoryItem[] = [
    { attempt_id: "p-w1a", skill: "writing", task_number: 1, task_title: "Email: Complaint",          is_mock_test: false, status: "complete", estimated_band: 7.0, created_at: new Date(now - day * 10).toISOString() },
    { attempt_id: "p-w1b", skill: "writing", task_number: 1, task_title: "Email: Apology",            is_mock_test: false, status: "complete", estimated_band: 7.5, created_at: new Date(now - day * 5).toISOString()  },
    { attempt_id: "p-w1c", skill: "writing", task_number: 1, task_title: "Email: Request",            is_mock_test: false, status: "complete", estimated_band: 8.0, created_at: new Date(now - day * 1).toISOString()  },
    { attempt_id: "p-w2a", skill: "writing", task_number: 2, task_title: "Opinion Essay: Technology", is_mock_test: false, status: "complete", estimated_band: 6.5, created_at: new Date(now - day * 8).toISOString()  },
    { attempt_id: "p-w2b", skill: "writing", task_number: 2, task_title: "Opinion Essay: Environment",is_mock_test: false, status: "complete", estimated_band: 7.0, created_at: new Date(now - day * 3).toISOString()  },
  ];

  const all = skill === "speaking" ? speaking : writing;
  return { items: all, total: all.length, page: 1, limit: 30, has_next: false };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProgressData(skill: Skill): UseProgressDataReturn {
  const { getToken, userId, isSignedIn } = useAuth();

  const { data, isLoading, isError } = useQuery<PaginatedHistory>({
    // Scope by userId — see useCurrentUser for rationale.
    queryKey: ["progress-history", userId ?? "anonymous", skill],

    queryFn: async () => {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 500));
        return buildMockHistory(skill);
      }
      const token  = await getToken();
      const params = new URLSearchParams({ skill, page: "1", limit: "30" });
      return api.get<PaginatedHistory>(
        `${API_V1}/history?${params.toString()}`,
        { headers: authHeaders(token) },
      );
    },

    staleTime: 60_000,  // 1 min
    retry: 1,
    enabled: USE_MOCK || (!!isSignedIn && !!userId),
  });

  const items = data?.items ?? [];

  const { taskStats, overview } = deriveStats(items, skill);
  const recentItems = items.slice(0, 5);

  return {
    taskStats,
    overviewStats: overview,
    recentItems,
    isLoading,
    isError,
  };
}
