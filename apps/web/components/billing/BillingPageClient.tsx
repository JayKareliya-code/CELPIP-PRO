"use client";

import { useState } from "react";
import { ShoppingBag, Package, LayoutGrid, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { PlanCard } from "@/components/billing/PlanCard";
import { AddonRow } from "@/components/billing/AddonRow";
import { BillingFAQ } from "@/components/billing/BillingFAQ";
import { SuccessHandler } from "@/components/billing/SuccessHandler";
import { BillingCartPanel } from "@/components/billing/BillingCartPanel";
import { PLANS } from "@/components/billing/PlanGrid";
import { ADDONS } from "@/components/billing/AddonGrid";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useBilling } from "@/lib/hooks/useBilling";
import { useBillingCartStore } from "@/store/billingCartStore";
import type { BillingPlan } from "@/lib/hooks/useBilling";
import type { UserPlan } from "@/lib/types";
import type { CartItem } from "@/store/billingCartStore";

interface BillingPageClientProps {
  success:    boolean;
  canceled:   boolean;
  planParam?: string;
  addonOnly?: boolean;
}

export function BillingPageClient({ success, canceled, planParam, addonOnly = false }: BillingPageClientProps) {
  const { user, isLoading: userLoading } = useCurrentUser();
  const { startCheckout } = useBilling();

  const [checkingOutPlan, setCheckingOutPlan] = useState<BillingPlan | null>(null);
  const currentPlan: UserPlan = (user?.plan ?? "starter") as UserPlan;

  const addItem = useBillingCartStore((s) => s.addItem);

  const handleUpgrade = (plan: BillingPlan) => {
    setCheckingOutPlan(plan);
    startCheckout(plan, {
      onError: (err: unknown) => {
        setCheckingOutPlan(null);
        const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        toast.error("Checkout failed", { description: msg });
      },
    });
  };

  const handleAddToCart = (item: Omit<CartItem, "quantity">) => {
    addItem(item);
    toast.success(`${item.name} added to cart`, { description: item.subtitle, duration: 2500 });
  };

  const starterPlan = PLANS.find((p) => p.id === "starter")!;
  const proPlan     = PLANS.find((p) => p.id === "pro")!;

  if (userLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <SuccessHandler success={success} canceled={canceled} plan={planParam} addonOnly={addonOnly} />

      <div className="animate-fade-in space-y-12">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 text-primary/70" />
            <h1 className="text-2xl font-bold text-white/90 tracking-tight">Billing & Store</h1>
          </div>
          <p className="text-sm text-white/55">
            Choose your plan and boost your prep with targeted practice add-ons.
          </p>
        </div>

        {/* ── Unified 4-column card row ── */}
        <div id="store-grid" className="space-y-3">
          {/* Section label row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Feature Plans label */}
            <div className="md:col-span-2 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-white/70 uppercase tracking-widest leading-none">Feature Plans</p>
                <p className="text-[11px] text-white/35 mt-0.5">Choose your subscription tier</p>
              </div>
            </div>
            {/* Add-Ons label */}
            <div className="md:col-span-2 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <LayoutGrid className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-white/70 uppercase tracking-widest leading-none">Add-Ons</p>
                <p className="text-[11px] text-white/35 mt-0.5">One-time packs — use any time</p>
              </div>
            </div>
          </div>

          {/* 4-column card row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-stretch">
            {/* Col 1: Starter plan */}
            <PlanCard
              plan={starterPlan}
              currentPlan={currentPlan}
              isCheckingOut={false}
              onUpgrade={handleUpgrade}
            />

            {/* Col 2: Pro plan */}
            <PlanCard
              plan={proPlan}
              currentPlan={currentPlan}
              isCheckingOut={checkingOutPlan === "pro"}
              onUpgrade={handleUpgrade}
            />

            {/* Cols 3–4: 2×2 addon grid — row heights auto-align */}
            <div className="md:col-span-2 grid grid-cols-2 gap-5 items-stretch">
              {ADDONS.map((addon) => (
                <AddonRow
                  key={addon.id}
                  config={addon}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </div>
        </div>

        <BillingFAQ />

        <p className="text-xs text-white/40 pb-8">
          Prices in CAD. Not affiliated with Paragon Testing Enterprises Inc.{" "}
          By purchasing you agree to our{" "}
          <a href="/terms" className="underline hover:text-white/70 transition-colors">Terms of Service</a>.
        </p>
      </div>
    </PageWrapper>
  );
}
