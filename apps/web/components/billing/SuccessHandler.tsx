"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SuccessHandler.tsx — Handles ?success=true and ?canceled=true query params
// on mount: invalidates react-query cache and shows a toast.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useBilling } from "@/lib/hooks/useBilling";

interface SuccessHandlerProps {
  success:  boolean;
  canceled: boolean;
  plan?:    string;
}

export function SuccessHandler({ success, canceled, plan }: SuccessHandlerProps) {
  const router                 = useRouter();
  const { refreshAfterPayment } = useBilling();

  useEffect(() => {
    if (success) {
      // Refresh both billing status + user profile (plan badge in navbar)
      refreshAfterPayment();

      const planLabel = plan
        ? plan.charAt(0).toUpperCase() + plan.slice(1)
        : "plan";

      toast.success(`🎉 Welcome to ${planLabel}!`, {
        description: "Your plan has been upgraded. All features are now unlocked.",
        duration:    6000,
      });

      // Clean up query params without re-render
      router.replace("/billing", { scroll: false });
    }

    if (canceled) {
      toast.info("Payment canceled", {
        description: "No charge was made. You can upgrade any time.",
        duration:    4000,
      });
      router.replace("/billing", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
