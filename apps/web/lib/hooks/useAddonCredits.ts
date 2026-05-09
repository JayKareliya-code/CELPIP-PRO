// ─────────────────────────────────────────────────────────────────────────────
// useAddonCredits.ts — Fetch the user's addon credit inventory
//
// Calls GET /api/v1/billing/addon-credits which returns per-skill, per-task
// {available, purchased} credit stats for both active and exhausted rows.
//
// Cache strategy:
//   staleTime = 30 s  — credits only change after a purchase or an attempt.
//   Invalidated by refreshAfterPayment() in useBilling (covers purchases).
//   The attempt-creation flow invalidates ["quota"] but NOT this key; the
//   available balance in the quota endpoint is the live signal for attempt
//   enforcement.  This hook is UI-only (billing inventory display).
//
// Usage:
//   const { summary, hasAnyCredits, isLoading } = useAddonCredits();
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useAuth }    from "@clerk/nextjs";
import { useQuery }   from "@tanstack/react-query";
import { useUser }    from "@clerk/nextjs";
import { api, API_V1, authHeaders } from "@/lib/api";
import type { AddonCreditSummary }  from "@/lib/types";

// ── Return type ───────────────────────────────────────────────────────────────

export interface AddonCreditsResult {
  /** Full credit summary (always defined — empty maps when no credits). */
  summary:       AddonCreditSummary;
  /** True when the user has purchased at least one addon credit (active or exhausted). */
  hasAnyCredits: boolean;
  /** True while the initial fetch is in flight. */
  isLoading:     boolean;
}

// ── Query key (exported so refreshAfterPayment can invalidate it) ─────────────

export const addonCreditsKey = (userId: string | null | undefined) =>
  ["addon-credits", userId ?? "anonymous"] as const;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAddonCredits(): AddonCreditsResult {
  const { getToken }  = useAuth();
  const { user }      = useUser();
  const userId        = user?.id ?? null;

  const { data, isLoading } = useQuery<AddonCreditSummary>({
    queryKey: addonCreditsKey(userId),

    queryFn: async (): Promise<AddonCreditSummary> => {
      const token = await getToken();
      return api.get<AddonCreditSummary>(
        `${API_V1}/billing/addon-credits`,
        { headers: authHeaders(token) },
      );
    },

    enabled:   !!userId,
    staleTime: 30_000,
    // Refetch when window regains focus so returning from a Stripe redirect
    // (which clears the tab) picks up new credits immediately.
    refetchOnWindowFocus: true,
  });

  const empty: AddonCreditSummary = { speaking: {}, writing: {} };
  const summary = data ?? empty;

  const hasAnyCredits =
    Object.keys(summary.speaking).length > 0 ||
    Object.keys(summary.writing).length  > 0;

  return { summary, hasAnyCredits, isLoading };
}
