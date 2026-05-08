"use client";

import { useEffect, useRef } from "react";
import { useRouter }         from "next/navigation";
import { toast }             from "sonner";
import { useBilling }        from "@/lib/hooks/useBilling";
import { useCurrentUser }    from "@/lib/hooks/useCurrentUser";

interface SuccessHandlerProps {
  success:  boolean;
  canceled: boolean;
  plan?:    string;
}

const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS        = 3;

export function SuccessHandler({ success, canceled, plan }: SuccessHandlerProps) {
  const router                  = useRouter();
  const { refreshAfterPayment } = useBilling();
  const { user }                = useCurrentUser();

  // Keep a ref to the polling interval so we can clear it
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);

  // Clear polling when component unmounts
  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  // Kick off polling when plan is still 'starter' after redirect
  useEffect(() => {
    if (!success) return;
    if (!user) return;
    // If SSE already delivered the update, plan won't be 'starter' — stop here.
    if (user.plan !== "starter") {
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
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success, user?.plan]);

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
