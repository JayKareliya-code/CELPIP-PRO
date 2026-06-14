// ─────────────────────────────────────────────────────────────────────────────
// useCreateCheckoutSession.ts — the SINGLE Stripe Checkout entry point.
//
// This hook is the one and only place in the app that POSTs to
// /api/v1/billing/checkout. It accepts a cart payload (CartItem[] + promo
// code) and, on success, hard-redirects the browser to the returned Stripe
// Checkout URL.
//
// Why a single entry point?
// ─────────────────────────
// We previously had a second `useBilling.startCheckout(plan)` shortcut for
// the "upgrade to pro" buttons in BillingPageClient. Two parallel mutations
// can produce two Checkout Sessions if the user clicks plan-card-upgrade and
// then cart-checkout (or vice versa) in quick succession. Routing all flows
// through this hook eliminates the duplicate. Single-plan upgrade callers
// construct a one-item cart inline.
//
// Re-entry guard
// ──────────────
// React's `button[disabled]` prop lags by one render. A fast double-click
// (or keyboard activation + click on the same event tick) can fire the
// mutation twice before TanStack marks it as pending. We add a ref-based
// in-flight flag inside the hook so the second call is a no-op until the
// first either resolves (redirect) or rejects (error).
//
// Idempotency
// ───────────
// Each call generates a client-side UUID and sends it as `Idempotency-Key`
// header. The backend doesn't honour it yet (TODO: backend should de-dup on
// this), but having the value in place means a server-side dedupe shipped
// later requires no frontend change.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useMutation } from "@tanstack/react-query";
import { useAuth }     from "@clerk/nextjs";
import { useRef }      from "react";
import { api, API_V1, authHeaders } from "@/lib/api";
import type { CartItem } from "@/store/billingCartStore";

interface CheckoutPayload {
  items:      CartItem[];
  promo_code: string | null;
}

interface CheckoutResponse {
  checkout_url: string;
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function useCreateCheckoutSession() {
  const { getToken } = useAuth();

  // In-flight guard. Set synchronously the moment a click starts the
  // mutation, cleared on resolve/reject. Defeats the React-disabled lag.
  const inFlightRef = useRef(false);

  const mutation = useMutation({
    mutationFn: async (payload: CheckoutPayload): Promise<CheckoutResponse> => {
      if (inFlightRef.current) {
        // A previous click is still in flight. Reject so onError fires.
        throw new Error("A checkout session is already being created. Please wait.");
      }
      inFlightRef.current = true;

      try {
        const token = await getToken();
        return await api.post<CheckoutResponse>(
          `${API_V1}/billing/checkout`,
          payload,
          {
            headers: {
              ...authHeaders(token),
              "Idempotency-Key": newIdempotencyKey(),
            },
          },
        );
      } finally {
        // Clear immediately on either success or error so a legitimate
        // retry after a failure (e.g. promo-code 422) isn't blocked.
        // The successful path overwrites the inFlight flag right before
        // the location.href assignment so the brief window between the
        // POST resolve and the navigation start is also covered.
        inFlightRef.current = false;
      }
    },
    onSuccess: ({ checkout_url }) => {
      // Re-block: the redirect is in flight, prevent another click queueing
      // a duplicate POST while the browser is unloading. The flag is reset
      // when the page actually navigates (full reload), so this is a clean
      // one-way latch.
      inFlightRef.current = true;
      window.location.href = checkout_url;
    },
  });

  return {
    createCheckoutSession: mutation.mutate,
    isPending: mutation.isPending,
    error:     mutation.error,
    isError:   mutation.isError,
    reset:     mutation.reset,
  };
}

/**
 * Convenience: builds a single-plan cart item for the "Upgrade to Pro"
 * buttons that don't go through the cart UI. Centralised here so the
 * server-side cart contract has exactly one client-side construction site.
 */
export function buildPlanCartItem(plan: "pro"): CartItem {
  return {
    id:        plan,
    type:      "plan",
    name:      plan === "pro" ? "Pro Plan" : plan,
    subtitle:  "Subscription",
    unitPrice: 0, // Server is authoritative — see checkout.py
    currency:  "CAD",
    quantity:  1,
    metadata:  { plan_slug: plan },
  };
}
