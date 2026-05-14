"use client";

/**
 * GlobalCartProvider
 *
 * Mounts ONCE in the root layout and makes the cart drawer + FAB
 * available on every authenticated page.
 *
 * Architecture:
 *  - BillingCartDrawerProvider  → supplies useBillingCartDrawer() context
 *  - CartFAB                    → fixed "View Cart" button, visible when cart > 0
 *  - BillingCartDrawer          → slide-in panel (right side)
 *
 * Any component anywhere in the tree can call:
 *   const addItem = useBillingCartStore((s) => s.addItem);
 * and the FAB will automatically appear without any per-component wiring.
 */

import type { ReactNode } from "react";
import { BillingCartDrawerProvider, BillingCartDrawer } from "./BillingCartDrawer";
import { CartFAB } from "./CartFAB";

export function GlobalCartProvider({ children }: { children: ReactNode }) {
  return (
    <BillingCartDrawerProvider>
      {children}
      <CartFAB />
      <BillingCartDrawer />
    </BillingCartDrawerProvider>
  );
}
