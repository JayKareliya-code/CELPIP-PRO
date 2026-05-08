"use client";

import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBillingCartStore } from "@/store/billingCartStore";
import { useBillingCartDrawer } from "./BillingCartDrawer";

export function CartFAB() {
  const { isOpen, open } = useBillingCartDrawer();
  const totalQty = useBillingCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.quantity, 0),
  );

  return (
    <button
      id="billing-cart-fab"
      onClick={open}
      aria-label={`Open cart${totalQty > 0 ? ` — ${totalQty} item${totalQty > 1 ? "s" : ""}` : ""}`}
      className={cn(
        "fixed top-[72px] right-6 z-30",
        "flex items-center gap-2 px-4 py-2.5 rounded-full",
        "bg-primary text-black font-semibold text-sm shadow-lg",
        "hover:brightness-110 active:scale-95 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        isOpen ? "opacity-0 pointer-events-none scale-90" : "opacity-100 scale-100",
      )}
    >
      <div className="relative">
        <ShoppingCart className="w-4 h-4" />
        {totalQty > 0 && (
          <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary text-black text-[9px] font-black flex items-center justify-center tabular-nums leading-none">
            {totalQty > 9 ? "9+" : totalQty}
          </span>
        )}
      </div>
      <span>View Cart</span>
    </button>
  );
}
