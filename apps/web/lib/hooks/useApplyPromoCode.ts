"use client";

import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { api, API_V1, authHeaders } from "@/lib/api";
import { useBillingCartStore } from "@/store/billingCartStore";

interface PromoValidateResponse {
  valid:       boolean;
  code:        string;
  percent_off: number | null;
  message?:    string;
}

export function useApplyPromoCode() {
  const { getToken } = useAuth();
  const applyPromo   = useBillingCartStore((s) => s.applyPromo);
  const clearPromo   = useBillingCartStore((s) => s.clearPromo);

  const mutation = useMutation({
    mutationFn: async (code: string): Promise<PromoValidateResponse> => {
      const token = await getToken();
      return api.post<PromoValidateResponse>(
        `${API_V1}/billing/promo/validate`,
        { code },
        { headers: authHeaders(token) },
      );
    },
    onSuccess: (data) => {
      if (data.valid && data.percent_off != null) {
        // Store the percent value (0–100); BillingCartPanel computes the dollar amount.
        applyPromo(data.code, data.percent_off);
      } else if (!data.valid) {
        clearPromo();
      }
    },
    onError: () => {
      clearPromo();
    },
  });

  return {
    applyPromoCode: mutation.mutate,
    isPending:      mutation.isPending,
    error:          mutation.error,
    isSuccess:      mutation.isSuccess,
    isError:        mutation.isError,
    reset:          mutation.reset,
  };
}
