"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useReport.ts — Fetch the full AI feedback report for a completed attempt
//
// GET /api/v1/attempts/{id}/report
// Report is immutable once created — staleTime: Infinity avoids re-fetching.
// ─────────────────────────────────────────────────────────────────────────────

import { useAuth }  from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { API_V1, api, authHeaders, USE_MOCK } from "@/lib/api";
import type { ReportResponse } from "@/lib/types";

// ── Mock data for local dev / Storybook ──────────────────────────────────────

const MOCK_REPORT: ReportResponse = {
  attempt_id:     "mock-attempt-001",
  skill:          "speaking",
  task_title:     "Describe a Photograph",
  estimated_band: 8.0,
  dimensions: [
    { dimension: "task_completion", label: "Task Completion",       score: 9,  max_score: 12 },
    { dimension: "coherence",       label: "Coherence & Cohesion",  score: 8,  max_score: 12 },
    { dimension: "vocabulary",      label: "Vocabulary Range",       score: 8,  max_score: 12 },
    { dimension: "fluency",         label: "Fluency & Pronunciation",score: 7,  max_score: 12 },
    { dimension: "grammar",         label: "Grammatical Accuracy",   score: 8,  max_score: 12 },
  ],
  strengths: [
    "Clear and direct description of the main subject",
    "Good use of spatial vocabulary (foreground, background)",
    "Appropriate response length with no long pauses",
  ],
  weaknesses: [
    "Limited variety in sentence structures — mostly simple clauses",
    "Vocabulary could be more precise (e.g. 'large' used repeatedly)",
  ],
  improvement_tips: [
    "Practice combining clauses with subordinators (although, while, whereas)",
    "Build a bank of descriptive adjectives specific to photos and scenes",
    "Record yourself and listen back to identify filler words",
    "Aim to elaborate each point with a specific detail or example",
  ],
  sample_response:
    "The photo depicts a bustling outdoor market on what appears to be a sunny afternoon. " +
    "In the foreground, vendors display vibrant produce and handcrafted goods on makeshift tables, " +
    "while in the background a crowd of shoppers moves between the stalls. " +
    "The atmosphere feels lively and communal, suggesting this market is a regular fixture of the neighbourhood.",
  transcript:
    "Um, in this photo I can see a market. There are lots of people. " +
    "There are some vegetables and fruits at the front. And in the back there are more people walking around. " +
    "The weather looks nice, sunny. The people look busy shopping.",
  completed_at: new Date(Date.now() - 60_000).toISOString(),
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseReportReturn {
  report:    ReportResponse | undefined;
  isLoading: boolean;
  isError:   boolean;
}

/**
 * Fetch the full AI feedback report for a completed attempt.
 *
 * Returns `undefined` while loading. The query is disabled if `attemptId` is empty.
 * Report data is cached indefinitely (staleTime: Infinity) because reports
 * are immutable — once generated they never change.
 */
export function useReport(attemptId: string): UseReportReturn {
  const { getToken } = useAuth();

  const { data, isLoading, isError } = useQuery<ReportResponse>({
    queryKey: ["report", attemptId],

    queryFn: async () => {
      if (USE_MOCK || attemptId.startsWith("mock-")) {
        // Simulate network latency in mock mode
        await new Promise((r) => setTimeout(r, 800));
        return MOCK_REPORT;
      }
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
