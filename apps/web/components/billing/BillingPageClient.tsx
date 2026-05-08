"use client";

import { useState } from "react";
import { ShoppingBag, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { PlanCard } from "@/components/billing/PlanCard";
import { AddonRow } from "@/components/billing/AddonRow";
import { BillingFAQ } from "@/components/billing/BillingFAQ";
import { SuccessHandler } from "@/components/billing/SuccessHandler";
import {
  BillingCartDrawerProvider,
  BillingCartDrawer,
} from "@/components/billing/BillingCartDrawer";
import { CartFAB } from "@/components/billing/CartFAB";
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
}

export function BillingPageClient({ success, canceled, planParam }: BillingPageClientProps) {
  const { user, isLoading: userLoading } = useCurrentUser();
  const { startCheckout } = useBilling();

  const [checkingOutPlan, setCheckingOutPlan] = useState<BillingPlan | null>(null);
  const currentPlan: UserPlan = (user?.plan ?? "starter") as UserPlan;
  const isPro = currentPlan === "pro";

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
    <BillingCartDrawerProvider>
      <PageWrapper>
        <SuccessHandler success={success} canceled={canceled} plan={planParam} />

        <div className="animate-fade-in space-y-12">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-amber-400/70" />
              <h1 className="text-2xl font-bold text-white/90 tracking-tight">Billing & Store</h1>
            </div>
            <p className="text-sm text-white/40">
              Choose your plan and boost your prep with targeted practice add-ons.
            </p>
          </div>

          {/* lg: 3 equal columns — Starter | Pro | Add-ons */}
          <div
            id="plans"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start scroll-mt-8"
          >
            <PlanCard
              plan={starterPlan}
              currentPlan={currentPlan}
              isCheckingOut={false}
              onUpgrade={handleUpgrade}
            />
            <PlanCard
              plan={proPlan}
              currentPlan={currentPlan}
              isCheckingOut={checkingOutPlan === "pro"}
              onUpgrade={handleUpgrade}
            />

            <div className="flex flex-col gap-3">
              <div className="pb-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Package className="w-4 h-4 text-white/30" />
                  <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Practice Add-ons</h3>
                </div>
                <p className="text-xs text-white/35">
                  {isPro ? "One-time question packs — use any time" : "Available on Pro — one-time purchases"}
                </p>
              </div>

              {ADDONS.map((addon) => (
                <AddonRow
                  key={addon.id}
                  config={{ ...addon, disabled: !isPro }}
                  onAddToCart={handleAddToCart}
                />
              ))}

              {!isPro && (
                <p className="text-[11px] text-white/25 text-center pt-1">
                  Upgrade to Pro to unlock add-ons.
                </p>
              )}
            </div>
          </div>

          <BillingFAQ />

          <p className="text-xs text-white/30 pb-8">
            Prices in CAD. Not affiliated with Paragon Testing Enterprises Inc.{" "}
            By purchasing you agree to our{" "}
            <a href="/terms" className="underline hover:text-white/60 transition-colors">Terms of Service</a>.
          </p>
        </div>
      </PageWrapper>

      <BillingCartDrawer />
      <CartFAB />
    </BillingCartDrawerProvider>
  );
}
