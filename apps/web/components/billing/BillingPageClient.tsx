"use client";

// ─────────────────────────────────────────────────────────────────────────────
// BillingPageClient.tsx — Client-side orchestrator for /billing
//
// Wires together: useCurrentUser + useBilling + usePlanEvents + sub-components.
// The parent page.tsx is a Server Component that reads searchParams and passes
// success/canceled booleans down to this boundary.
//
// Real-time plan update flow:
//   Stripe webhook → backend commits plan → Redis publish →
//   SSE stream → usePlanEvents → cache invalidation → UI re-renders
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { CurrentPlanBanner } from "@/components/billing/CurrentPlanBanner";
import { PlanGrid } from "@/components/billing/PlanGrid";
import { BillingFAQ } from "@/components/billing/BillingFAQ";
import { SuccessHandler } from "@/components/billing/SuccessHandler";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useBilling } from "@/lib/hooks/useBilling";
import { usePlanEvents } from "@/lib/hooks/usePlanEvents";
import type { BillingPlan } from "@/lib/hooks/useBilling";
import type { UserPlan } from "@/lib/types";
import { Loader2, CreditCard } from "lucide-react";

// ── Props from server page ────────────────────────────────────────────────────

interface BillingPageClientProps {
  success: boolean;
  canceled: boolean;
  planParam?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BillingPageClient({ success, canceled, planParam }: BillingPageClientProps) {
  const { user, isLoading: userLoading } = useCurrentUser();
  const {
    billingStatus,
    startCheckout,
    openPortal,
    isOpeningPortal,
  } = useBilling();

  // Subscribe to SSE plan-events stream — updates UI instantly when Stripe
  // webhook fires, without requiring a page reload.
  usePlanEvents();

  // Track which specific plan is mid-checkout to show spinner on that card only
  const [checkingOutPlan, setCheckingOutPlan] = useState<BillingPlan | null>(null);

  const currentPlan: UserPlan = (user?.plan ?? "starter") as UserPlan;

  const handleUpgrade = (plan: BillingPlan) => {
    setCheckingOutPlan(plan);
    startCheckout(plan, {
      onError: (err: unknown) => {
        setCheckingOutPlan(null);
        const msg =
          err instanceof Error ? err.message : "Something went wrong. Please try again.";
        toast.error("Checkout failed", { description: msg });
      },
    });
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (userLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageWrapper>
      {/* Handles ?success=true / ?canceled=true on mount */}
      <SuccessHandler success={success} canceled={canceled} plan={planParam} />

      <div className="space-y-6 animate-fade-in">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Billing &amp; Plans
            </h1>
          </div>
          <p className="text-sm text-subtle">
            One-time payments. No subscriptions, no renewals. Your attempts never expire.
          </p>
        </div>

        {/* ── Current plan banner ──────────────────────────────────────────── */}
        <CurrentPlanBanner
          plan={currentPlan}
          billingStatus={billingStatus}
          onOpenPortal={openPortal}
          isOpeningPortal={isOpeningPortal}
        />

        {/* ── Section title ─────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">Choose Your Plan</h2>
          <p className="text-sm text-subtle">
            Upgrade any time. Attempts from previous plans are preserved.
          </p>
        </div>

        {/* ── Plan cards ───────────────────────────────────────────────────── */}
        <PlanGrid
          currentPlan={currentPlan}
          checkingOutPlan={checkingOutPlan}
          onUpgrade={handleUpgrade}
        />

        {/* ── Trust strip ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-surface/60 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {[
            { label: "Payment Security", text: "Processed by Stripe — PCI DSS Level 1 certified." },
            { label: "One-Time Only", text: "No subscription. No renewal. Pay once, use forever." },
            { label: "Never Expires", text: "Your attempts stay in your account until you use them." },
          ].map(({ label, text }) => (
            <div key={label} className="space-y-1">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">{label}</p>
              <p className="text-sm text-subtle leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <BillingFAQ />

        {/* ── Legal footnote ───────────────────────────────────────────────── */}
        <p className="text-center text-xs text-subtle pb-4">
          Prices in CAD. Not affiliated with Paragon Testing Enterprises Inc.
          By purchasing you agree to our{" "}
          <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>.
        </p>

      </div>
    </PageWrapper>
  );
}
