"use client";

import { TrendingUp } from "lucide-react";
import { useAuth }  from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { api, authHeaders, API_V1, USE_MOCK } from "@/lib/api";
import type { PaginatedHistory, HistoryItem } from "@/lib/types";

// ── Data fetching ─────────────────────────────────────────────────────────────

function useLatestBands() {
  const { getToken } = useAuth();

  return useQuery<{ speaking: number | null; writing: number | null }>({
    queryKey: ["dashboard-latest-bands"],
    queryFn: async () => {
      if (USE_MOCK) {
        // Mock: return placeholder values so the UI renders
        return { speaking: null, writing: null };
      }
      const token = await getToken();
      const data = await api.get<PaginatedHistory>(
        `${API_V1}/history?limit=20`,
        { headers: authHeaders(token) },
      );

      const getLatest = (skill: "speaking" | "writing"): number | null => {
        const hit = data.items
          .filter((a: HistoryItem) => a.skill === skill && a.status === "complete" && a.estimated_band != null)
          .at(0);
        return hit?.estimated_band ?? null;
      };

      return { speaking: getLatest("speaking"), writing: getLatest("writing") };
    },
    staleTime: 60_000, // 1 min — doesn't change mid-session
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Shows the user's latest estimated band per skill as a progress bar.
 * Fetches the last 20 attempts from the real history API to derive the values.
 */
export function ProgressSummaryWidget() {
  const { data, isLoading } = useLatestBands();

  const rows = [
    { label: "Speaking", band: data?.speaking ?? null },
    { label: "Writing",  band: data?.writing  ?? null },
  ];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface shadow-card p-5 animate-pulse">
        <div className="h-4 w-28 bg-muted rounded mb-4" />
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Estimated Band</h2>
      </div>

      <div className="space-y-4">
        {rows.map(({ label, band }) => (
          <div key={label}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-medium text-foreground">{label}</span>
              <span className="text-sm font-bold text-primary">
                {band !== null ? band : "—"}
                <span className="text-subtle font-normal"> / 12</span>
              </span>
            </div>
            <Progress value={band !== null ? (band / 12) * 100 : 0} className="h-2" />
          </div>
        ))}
      </div>

      {rows.every(({ band }) => band === null) && (
        <p className="mt-4 text-xs text-subtle">
          Complete a practice attempt to see your estimated band here.
        </p>
      )}
    </div>
  );
}
