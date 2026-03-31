// ─────────────────────────────────────────────────────────────────────────────
// usePrompts.ts — Fetch speaking / writing prompts
//
// Phase 1: returns mock data immediately (no network).
// Phase 2: fetches from the real API using apiFetch.
//
// Usage:
//   const { prompts, isLoading } = usePrompts("speaking");
//   const { prompts, isLoading } = usePrompts("writing");
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useAuth }  from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { USE_MOCK, API_V1, api, authHeaders } from "@/lib/api";
import { MOCK_SPEAKING_TASKS, MOCK_WRITING_TASKS } from "@/lib/mockData";
import type { Skill, SpeakingTask, WritingTask } from "@/lib/types";

// ── Return type ───────────────────────────────────────────────────────────────

interface UsePromptsReturn<T> {
  prompts:   T[];
  isLoading: boolean;
  isError:   boolean;
}

// ── Overloads + implementation ────────────────────────────────────────────────
// The overload signatures must immediately precede the implementation (no gap).

export function usePrompts(skill: "speaking"): UsePromptsReturn<SpeakingTask>;
export function usePrompts(skill: "writing"):  UsePromptsReturn<WritingTask>;
export function usePrompts(
  skill: Skill,
): UsePromptsReturn<SpeakingTask | WritingTask> {
  const { getToken } = useAuth();

  const { data, isLoading, isError } = useQuery<(SpeakingTask | WritingTask)[]>({
    queryKey: ["prompts", skill],

    queryFn: async () => {
      if (USE_MOCK) {
        // Brief async tick so isLoading flips true — consistent with real mode
        await Promise.resolve();
        return skill === "speaking"
          ? (MOCK_SPEAKING_TASKS as (SpeakingTask | WritingTask)[])
          : (MOCK_WRITING_TASKS  as (SpeakingTask | WritingTask)[]);
      }
      const token = await getToken();
      const path  =
        skill === "speaking"
          ? `${API_V1}/speaking/tasks`
          : `${API_V1}/writing/tasks`;
      return api.get<(SpeakingTask | WritingTask)[]>(path, {
        headers: authHeaders(token),
      });
    },

    staleTime: 10 * 60_000,
  });

  return { prompts: data ?? [], isLoading, isError };
}
