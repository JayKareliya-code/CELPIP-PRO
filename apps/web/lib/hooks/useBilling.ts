// ─────────────────────────────────────────────────────────────────────────────
// useBilling.ts — Stripe billing mutations & status query
//
// Exposes:
//   startCheckout(plan)  → POST /billing/checkout → redirect to Stripe
//   openPortal()         → GET  /billing/portal   → redirect to Stripe portal
//   billingStatus        → GET  /billing/status   → {plan, has_active_purchase}
//
// Cache-safety: the query key includes the Clerk userId so different users
// never share a billing-status cache entry within the same tab session.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/nextjs";
import { api, API_V1, authHeaders } from "@/lib/api";
import { addonCreditsKey } from "@/lib/hooks/useAddonCredits";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BillingPlan = "pro";

export interface BillingStatus {
  plan: string;
  stripe_customer_id: string | null;
  has_active_purchase: boolean;
}

// ── Query key factory ─────────────────────────────────────────────────────────

/**
 * Returns the React Query cache key for billing status scoped to a specific user.
 * Always pass the Clerk userId so different accounts never share a cache entry.
 *
 * Used by both useBilling and usePlanEvents (for invalidation).
 */
export const billingStatusKey = (userId: string | null | undefined) =>
  ["billing-status", userId ?? "anonymous"] as const;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBilling() {
  const { getToken, isSignedIn } = useAuth();
  const { user: clerkUser }      = useUser();
  const queryClient              = useQueryClient();

  const userId  = clerkUser?.id ?? null;
  const cacheKey = billingStatusKey(userId);

  // ── Billing status query ───────────────────────────────────────────────────

  const { data: billingStatus, isLoading: statusLoading } =
    useQuery<BillingStatus>({
      queryKey: cacheKey,
      queryFn: async () => {
        const token = await getToken();
        return api.get<BillingStatus>(`${API_V1}/billing/status`, {
          headers: authHeaders(token),
        });
      },
      enabled: !!isSignedIn && !!userId,
      // SSE (usePlanEvents) provides instant invalidation after a plan upgrade.
      // This staleTime is a safety-net fallback for when the SSE stream is
      // disconnected (e.g. background tab, proxy timeout).
      staleTime: 10_000,
      // Refetch when the user switches back to this tab after upgrading elsewhere.
      refetchOnWindowFocus: true,
    });

  // ── Open customer portal ───────────────────────────────────────────────────
  // Note: the previous `startCheckout(plan)` shortcut was removed to eliminate
  // a duplicate /billing/checkout entry point. All checkout flows now go
  // through `useCreateCheckoutSession`, which carries the re-entry guard and
  // idempotency key. Plan-upgrade callers should call createCheckoutSession
  // with a single `buildPlanCartItem("pro")` item.

  const portalMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return api.get<{ portal_url: string }>(`${API_V1}/billing/portal`, {
        headers: authHeaders(token),
      });
    },
    onSuccess: ({ portal_url }) => {
      window.location.href = portal_url;
    },
  });

  // ── Refresh queries after successful payment ───────────────────────────────

  /**
   * Call this after Stripe redirects back with ?success=true.
   * Invalidates both billing status and the user profile (plan badge update).
   * Uses the userId-scoped keys so only THIS user's cache is refreshed.
   */
  const refreshAfterPayment = () => {
    queryClient.invalidateQueries({ queryKey: cacheKey });
    queryClient.invalidateQueries({ queryKey: ["current-user", userId] });
    // Invalidate quota so speaking/writing limits update immediately after purchase.
    queryClient.invalidateQueries({ queryKey: ["quota"] });
    // Invalidate practiceQuota (mock test quota shown on Practice Tests page).
    queryClient.invalidateQueries({ queryKey: ["practiceQuota"] });
    // Invalidate addon-credits so the Usage tab's Practice Packs section refreshes.
    queryClient.invalidateQueries({ queryKey: addonCreditsKey(userId) });
  };

  return {
    billingStatus,
    statusLoading,
    openPortal:     portalMutation.mutate,
    isOpeningPortal: portalMutation.isPending,
    refreshAfterPayment,
  };
}
