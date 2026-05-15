// ─────────────────────────────────────────────────────────────────────────────
// useCreateCheckoutSession.ts — Cart-aware Stripe checkout mutation
//
// Accepts the full cart payload (CartItem[] + optional promoCode) and
// POSTs it to POST /api/v1/billing/checkout, then hard-redirects to the
// returned Stripe Checkout URL.
//
// The backend is responsible for:
//   • Validating all price IDs and quantities
//   • Applying the promo code discount
//   • Enforcing user plan eligibility
//   • Creating the Stripe Checkout Session
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { api, API_V1, authHeaders } from "@/lib/api";
import type { CartItem } from "@/store/billingCartStore";

interface CheckoutPayload {
  items: CartItem[];
  promo_code: string | null;
}

interface CheckoutResponse {
  checkout_url: string;
}

export function useCreateCheckoutSession() {
  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (payload: CheckoutPayload): Promise<CheckoutResponse> => {
      const token = await getToken();
      return api.post<CheckoutResponse>(
        `${API_V1}/billing/checkout`,
        payload,
        { headers: authHeaders(token) },
      );
    },
    onSuccess: ({ checkout_url }) => {
      window.location.href = checkout_url;
    },
  });

  return {
    createCheckoutSession: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    isError: mutation.isError,
  };
}
