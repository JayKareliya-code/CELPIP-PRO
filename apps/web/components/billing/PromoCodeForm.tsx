"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PromoCodeForm.tsx — Promo code input + apply button
//
// Lives inside BillingCartPanel. Shows:
//   • Text input (id="billing-promo-input")
//   • Apply button (id="billing-promo-apply") with loading state
//   • Inline success badge when a code is applied
//   • Inline error message on failure
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Tag, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApplyPromoCode } from "@/lib/hooks/useApplyPromoCode";
import { useBillingCartStore } from "@/store/billingCartStore";

export function PromoCodeForm() {
  const [code, setCode] = useState("");

  const promoCode     = useBillingCartStore((s) => s.promoCode);
  const promoDiscount = useBillingCartStore((s) => s.promoDiscount);
  const clearPromo    = useBillingCartStore((s) => s.clearPromo);

  const { applyPromoCode, isPending, isError, error, reset } = useApplyPromoCode();

  const errorMessage =
    isError && error instanceof Error ? error.message : isError ? "Invalid promo code." : null;

  const handleApply = () => {
    if (!code.trim()) return;
    reset();
    applyPromoCode(code.trim());
  };

  const handleRemove = () => {
    clearPromo();
    setCode("");
    reset();
  };

  // ── Applied state ──────────────────────────────────────────────────────────

  if (promoCode) {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-success/10 border border-success/25">
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-success" />
          <span className="text-xs font-semibold text-success">{promoCode}</span>
          <span className="text-xs text-subtle">−${promoDiscount.toFixed(2)} CAD</span>
        </div>
        <button
          onClick={handleRemove}
          aria-label="Remove promo code"
          className="text-subtle/50 hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ── Input state ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          id="billing-promo-input"
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (isError) reset();
          }}
          onKeyDown={(e) => e.key === "Enter" && handleApply()}
          placeholder="Have a promo code?"
          disabled={isPending}
          className={cn(
            "flex-1 bg-muted border rounded-lg px-3 py-2 text-sm text-foreground",
            "placeholder:text-subtle/50 outline-none transition-colors",
            "focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
            isError ? "border-danger/50" : "border-border",
            "disabled:opacity-50",
          )}
        />
        <button
          id="billing-promo-apply"
          onClick={handleApply}
          disabled={isPending || !code.trim()}
          className={cn(
            "px-3 py-2 rounded-lg border border-border text-sm font-medium",
            "text-subtle hover:text-foreground hover:border-primary/40 transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "min-w-[64px] flex items-center justify-center gap-1.5",
          )}
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
        </button>
      </div>

      {errorMessage && (
        <p className="text-xs text-danger pl-1">{errorMessage}</p>
      )}
    </div>
  );
}
