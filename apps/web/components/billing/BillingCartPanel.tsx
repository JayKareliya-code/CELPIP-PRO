"use client";

import { ShoppingCart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BillingCartItem } from "./BillingCartItem";
import { PromoCodeForm } from "./PromoCodeForm";
import { BillingTrustStrip } from "./BillingTrustStrip";
import {
  useBillingCartStore,
  selectSubtotal,
  selectTotal,
  formatCAD,
  isPromoFresh,
} from "@/store/billingCartStore";
import { useCreateCheckoutSession } from "@/lib/hooks/useCreateCheckoutSession";
import { toast } from "sonner";

interface BillingCartPanelProps {
  /** Flat layout for use inside the drawer; standalone card otherwise. */
  embedded?: boolean;
}

export function BillingCartPanel({ embedded = false }: BillingCartPanelProps) {
  const items          = useBillingCartStore((s) => s.items);
  const promoCode      = useBillingCartStore((s) => s.promoCode);
  const promoDiscount  = useBillingCartStore((s) => s.promoDiscount);
  const promoAppliedAt = useBillingCartStore((s) => s.promoAppliedAt);
  const clearPromo     = useBillingCartStore((s) => s.clearPromo);
  const increaseQty    = useBillingCartStore((s) => s.increaseQty);
  const decreaseQty    = useBillingCartStore((s) => s.decreaseQty);
  const removeItem     = useBillingCartStore((s) => s.removeItem);

  const subtotal        = selectSubtotal(items);
  const discountPercent = promoCode ? promoDiscount : 0;
  const discountAmount  = Math.round(subtotal * discountPercent) / 100;
  const total           = selectTotal(subtotal, discountAmount);

  const { createCheckoutSession, isPending } = useCreateCheckoutSession();
  const isEmpty = items.length === 0;

  const handleCheckout = () => {
    if (!items.length) return;
    if (isPending) return; // belt: ignore rapid duplicate clicks before disabled propagates

    // Promo TTL: if the verdict is older than PROMO_TTL_MS, drop it and ask
    // the user to re-apply. Stripe re-validates the code at session creation,
    // so a stale verdict here would silently produce a price mismatch — the
    // cart shows -20% but Stripe charges full price. Better to surface the
    // expiry up-front than create a billing dispute.
    if (!isPromoFresh({ promoCode, promoAppliedAt })) {
      clearPromo();
      toast.info("Promo code expired", {
        description: "Please re-apply your code before checkout.",
        duration: 5000,
      });
      return;
    }

    createCheckoutSession(
      { items, promo_code: promoCode },
      {
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
          toast.error("Checkout failed", { description: msg });
        },
      },
    );
  };

  const inner = (
    <div className="space-y-5">
      {isEmpty ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <ShoppingCart className="w-10 h-10 text-white/20" />
          <p className="text-sm text-white/50 leading-snug max-w-[220px]">
            Your cart is empty. Choose a plan or add a practice pack to continue.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <BillingCartItem
              key={item.id}
              item={item}
              onIncrease={increaseQty}
              onDecrease={decreaseQty}
              onRemove={removeItem}
            />
          ))}
        </div>
      )}

      <PromoCodeForm />

      <div className="space-y-2 border-t border-white/[0.08] pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-white/55">Subtotal</span>
          <span className="text-white/80 tabular-nums">${formatCAD(subtotal)} CAD</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-emerald-400">Promo ({discountPercent}% off)</span>
            <span className="text-emerald-400 tabular-nums">−${formatCAD(discountAmount)} CAD</span>
          </div>
        )}

        <div className="flex justify-between items-baseline text-sm font-bold pt-2 border-t border-white/[0.08]">
          <div>
            <span className="text-white/75">Total</span>
            <p className="text-[10px] font-normal text-white/40 mt-0.5">
              Applicable taxes calculated at checkout
            </p>
          </div>
          <span className="text-primary tabular-nums">${formatCAD(total)} CAD</span>
        </div>
      </div>

      <button
        id="billing-checkout-button"
        onClick={handleCheckout}
        disabled={isEmpty || isPending}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-3.5 rounded-lg",
          "bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm transition-all duration-200",
          "disabled:opacity-40 disabled:cursor-not-allowed",
        )}
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <span>Proceed to Checkout</span>
            <span className="opacity-50 font-light">·</span>
            <span className="tabular-nums">${formatCAD(total)} CAD</span>
            <span>→</span>
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-white/45">
        Secure checkout powered by Stripe
      </p>

      <BillingTrustStrip />
    </div>
  );

  if (embedded) return <div className="p-5">{inner}</div>;

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card p-5">
      {inner}
    </div>
  );
}
