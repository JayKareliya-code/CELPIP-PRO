"use client";

import { useEffect, useRef } from "react";
import { useRouter }         from "next/navigation";
import { toast }             from "sonner";
import { useBilling }        from "@/lib/hooks/useBilling";
import { useCurrentUser }    from "@/lib/hooks/useCurrentUser";
import { useBillingCartStore } from "@/store/billingCartStore";

interface SuccessHandlerProps {
  success:    boolean;
  canceled:   boolean;
  plan?:      string;
  /** True when the cart contained only addon items (no plan upgrade). */
  addonOnly?: boolean;
}

const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS        = 3;

export function SuccessHandler({ success, canceled, plan, addonOnly = false }: SuccessHandlerProps) {
  const router                  = useRouter();
  const { refreshAfterPayment } = useBilling();
  const { user }                = useCurrentUser();
  const clearCart               = useBillingCartStore((s) => s.clearCart);

  // Keep a ref to the polling interval so we can clear it
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);

  // Clear polling when component unmounts
  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  // ── Post-checkout polling ──────────────────────────────────────────────────
  // Stripe webhooks are typically delivered in 1–3 s but can take 10 s+ at
  // P99. The same 3-poll backstop runs for BOTH plan upgrades and addon-only
  // purchases — without it, addon-only buyers used to see the success toast
  // but no credits until they manually refreshed. Plan upgrades stop early
  // when the SSE-delivered plan change is observed; addon purchases just
  // exhaust the poll budget (refreshAfterPayment invalidates the addon-credits
  // query, which is the signal that matters).
  useEffect(() => {
    if (!success) return;
    if (!user) return;
    // Plan-upgrade fast path: SSE already delivered → done.
    if (!addonOnly && user.plan !== "starter") {
      if (pollTimer.current) clearInterval(pollTimer.current);
      return;
    }

    if (pollTimer.current) return; // already polling

    pollTimer.current = setInterval(() => {
      pollCount.current += 1;
      refreshAfterPayment();

      if (pollCount.current >= MAX_POLLS) {
        clearInterval(pollTimer.current!);
        pollTimer.current = null;
        // Webhook still hasn't landed. The SSE listener and window-focus
        // refetch will catch it eventually; surface a friendly note for the
        // plan path. We don't toast for addon-only here because the toast
        // from the mount effect ("Practice packs added!") already implied
        // success — telling them it's still finalising would confuse.
        if (!addonOnly) {
          toast.info("Still finalizing your upgrade…", {
            description:
              "Payment succeeded — this can take a moment. Refresh the page if your plan doesn't update shortly.",
            duration: 8000,
          });
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success, addonOnly, user?.plan]);

  // ── One-shot on mount (success / canceled) ──────────────────────────────────
  useEffect(() => {
    if (success) {
      // Always refresh billing status + quota immediately (catches addon credit refresh too)
      refreshAfterPayment();

      // Clear the cart — purchase is complete
      clearCart();

      if (addonOnly) {
        // Addon-only purchase — plan didn't change, just credits added
        toast.success("🎉 Practice packs added!", {
          description: "Your extra questions are ready. Start practising any time.",
          duration:    6000,
        });
      } else {
        const planLabel = plan
          ? plan.charAt(0).toUpperCase() + plan.slice(1)
          : "Pro";
        toast.success(`🎉 Welcome to ${planLabel}!`, {
          description: "Your plan has been upgraded. All features are now unlocked.",
          duration:    6000,
        });
      }

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
