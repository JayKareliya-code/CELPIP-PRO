// ─────────────────────────────────────────────────────────────────────────────
// useAttemptStatus.ts — Polling hook for attempt processing status
//
// Uses React Query's `refetchInterval` to poll GET /api/v1/attempts/{id}/status
// every 3 seconds until status is "complete" or "failed", then stops.
//
// In Phase 1 (mock mode): returns a mock that transitions
// "processing" → "complete" after 5 seconds.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useRef }   from "react";
import { useAuth }  from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { ATTEMPT_POLL_INTERVAL_MS }          from "@/lib/constants";
import { USE_MOCK, API_V1, api, authHeaders } from "@/lib/api";
import type { AttemptStatusResponse }         from "@/lib/types";
import { MOCK_RECENT_ATTEMPTS }               from "@/lib/mockData";

// ── Mock resolver ──────────────────────────────────────────────────────────────

/**
 * Returns a mock AttemptStatusResponse transitioning processing → complete.
 * `startedAt` via useRef ensures the timer is stable across React Query refetches.
 */
function getMockStatus(attemptId: string, startedAt: number): AttemptStatusResponse {
  const elapsed    = Date.now() - startedAt;
  const isComplete = elapsed > 5_000;
  const base       = MOCK_RECENT_ATTEMPTS.find((a) => a.id === attemptId);

  return {
    attempt_id:       attemptId,
    status:           isComplete ? "complete" : "processing",
    skill:            (base?.skill ?? "speaking") as AttemptStatusResponse["skill"],
    celery_task_id:   null,
    error_message:    null,
    report_available: isComplete,
    created_at:       new Date(startedAt).toISOString(),
    updated_at:       new Date().toISOString(),
    estimated_band:   isComplete ? 7.5 : null,
    feedback:         isComplete ? (base?.feedback ?? undefined) : undefined,
  };
}

// ── Hook public interface ──────────────────────────────────────────────────────

export interface UseAttemptStatusReturn {
  attempt:    AttemptStatusResponse | undefined;
  isLoading:  boolean;
  isError:    boolean;
  isComplete: boolean;
  isFailed:   boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Polls GET /api/v1/attempts/{id}/status every 3 s until terminal state.
 * Attaches a Clerk Bearer token on every request.
 * Stops polling once status is "complete" or "failed".
 *
 * @param attemptId - UUID from the URL param (e.g. `/attempts/[id]/status`).
 */
export function useAttemptStatus(attemptId: string): UseAttemptStatusReturn {
  const startedAtRef = useRef<number>(Date.now());
  const { getToken } = useAuth();

  const { data, isLoading, isError } = useQuery<AttemptStatusResponse>({
    queryKey: ["attempt-status", attemptId],

    queryFn: async () => {
      if (USE_MOCK || attemptId.startsWith("mock-")) {
        return getMockStatus(attemptId, startedAtRef.current);
      }
      const token = await getToken();
      return api.get<AttemptStatusResponse>(
        `${API_V1}/attempts/${attemptId}/status`,
        { headers: authHeaders(token) },
      );
    },

    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "complete" || status === "failed") return false;
      return ATTEMPT_POLL_INTERVAL_MS;
    },

    staleTime: 0,
  });

  return {
    attempt:    data,
    isLoading,
    isError,
    isComplete: data?.status === "complete",
    isFailed:   data?.status === "failed",
  };
}
