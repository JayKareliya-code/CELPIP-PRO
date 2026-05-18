"use client";

import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBillingCartStore } from "@/store/billingCartStore";
import { useBillingCartDrawer } from "./BillingCartDrawer";

// ─────────────────────────────────────────────────────────────────────────────
// CartFAB — Floating cart button anchored to the top-right of the viewport.
//
// Responsive form factor:
//   • Mobile (< sm): compact icon-only circular button — keeps the FAB out
//     of the way and avoids overlapping mobile navbar elements with a long
//     "View Cart" label.
//   • Desktop (sm+): full pill with icon + "View Cart" text.
// ─────────────────────────────────────────────────────────────────────────────

export function CartFAB() {
  const { isOpen, open } = useBillingCartDrawer();
  const totalQty = useBillingCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.quantity, 0),
  );

  return (
    <button
      id="billing-cart-fab"
      onClick={open}
      suppressHydrationWarning
      aria-label={`Open cart${totalQty > 0 ? ` — ${totalQty} item${totalQty > 1 ? "s" : ""}` : ""}`}
      className={cn(
        // Position — tighter to the edge on mobile, normal on desktop.
        "fixed top-[64px] sm:top-[72px] right-3 sm:right-6 z-30",

        // Form factor — icon-only circle on mobile, pill with label on sm+.
        "flex items-center justify-center sm:gap-2",
        "h-11 w-11 sm:h-auto sm:w-auto sm:px-4 sm:py-2.5",
        "rounded-full",

        // Theming
        "bg-primary text-black font-semibold text-sm shadow-lg",
        "hover:brightness-110 active:scale-95 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",

        // Hidden when the drawer is open.
        isOpen ? "opacity-0 pointer-events-none scale-90" : "opacity-100 scale-100",
      )}
    >
      <div className="relative">
        <ShoppingCart className="w-5 h-5 sm:w-4 sm:h-4" />
        {totalQty > 0 && (
          <span
            className={cn(
              "absolute -top-2 -right-2 w-[18px] h-[18px] sm:w-4 sm:h-4 rounded-full",
              "bg-black text-primary text-[10px] sm:text-[9px] font-black",
              "flex items-center justify-center tabular-nums leading-none",
              "ring-2 ring-primary",
            )}
          >
            {totalQty > 9 ? "9+" : totalQty}
          </span>
        )}
      </div>
      <span className="hidden sm:inline">View Cart</span>
    </button>
  );
}
