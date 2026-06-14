import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CartItemType =
  | "plan"
  | "writing_pack"
  | "speaking_pack"
  | "custom_bundle"
  | "mock_bundle";

export interface CartItem {
  id:        string;
  type:      CartItemType;
  name:      string;
  subtitle:  string;
  unitPrice: number;
  currency:  "CAD";
  quantity:  number;
  metadata:  Record<string, string>;
}

interface BillingCartState {
  items:           CartItem[];
  promoCode:       string | null;
  promoDiscount:   number;
  /** Wall-clock ms when the promo verdict was minted. Used to enforce a
   *  short TTL so a code that expired in Stripe between apply-time and
   *  checkout doesn't keep showing a fake discount in the UI. */
  promoAppliedAt:  number | null;

  /** Adds item to cart; increases quantity if the same id already exists. */
  addItem:     (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  increaseQty: (id: string) => void;
  /** Decreases quantity by 1; removes item automatically when it hits 0. */
  decreaseQty: (id: string) => void;
  removeItem:  (id: string) => void;
  clearCart:   () => void;
  applyPromo:  (code: string, discount: number) => void;
  clearPromo:  () => void;
}

/** Promo verdict freshness window (ms). Stripe re-validates the code at
 *  Checkout-Session creation, so a stale verdict here silently drops the
 *  discount — user sees -20% in the cart and pays full price at Stripe.
 *  Five minutes is short enough to catch most expiries and long enough to
 *  not annoy a user who's adding more items to their cart. */
export const PROMO_TTL_MS = 5 * 60 * 1000;

/** True when no promo is applied, or the applied promo is still fresh. */
export function isPromoFresh(state: Pick<BillingCartState, "promoCode" | "promoAppliedAt">): boolean {
  if (!state.promoCode || state.promoAppliedAt === null) return true; // nothing to check
  return Date.now() - state.promoAppliedAt < PROMO_TTL_MS;
}

/**
 * localStorage key. The `celpip-` prefix is intentional — AuthCacheGuard
 * sweeps every `celpip-*` key when the signed-in userId changes, so a cart
 * built by User A on a shared browser does NOT bleed into User B's session.
 * The `-v1` suffix lets us bump the storage schema later by migrating to
 * `-v2` and discarding old payloads.
 */
const CART_STORAGE_KEY = "celpip-cart-v1";

export const useBillingCartStore = create<BillingCartState>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: null,
      promoDiscount: 0,
      promoAppliedAt: null,

      addItem: (item) => {
        const { items } = get();
        const existing  = items.find((i) => i.id === item.id);

        if (existing) {
          set({ items: items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + (item.quantity ?? 1) } : i,
          )});
        } else {
          set({ items: [...items, { ...item, quantity: item.quantity ?? 1 }] });
        }
      },

      increaseQty: (id) => {
        set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, quantity: i.quantity + 1 } : i) }));
      },

      decreaseQty: (id) => {
        set((s) => ({
          items: s.items
            .map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
            .filter((i) => i.quantity > 0),
        }));
      },

      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clearCart:  ()   => set({ items: [], promoCode: null, promoDiscount: 0, promoAppliedAt: null }),
      applyPromo: (code, discount) =>
        set({ promoCode: code, promoDiscount: discount, promoAppliedAt: Date.now() }),
      clearPromo: ()   => set({ promoCode: null, promoDiscount: 0, promoAppliedAt: null }),
    }),
    {
      name:    CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist the data, not the action callbacks. Without partialize
      // Zustand would JSON-stringify the whole state object — actions would
      // serialize as `null` on the next load and the cart would appear
      // populated but the buttons would be no-ops.
      partialize: (state) => ({
        items:          state.items,
        promoCode:      state.promoCode,
        promoDiscount:  state.promoDiscount,
        promoAppliedAt: state.promoAppliedAt,
      }),
      // Schema version. Bump if CartItem shape changes; older payloads
      // will be discarded by Zustand's migration handling.
      version: 1,
    },
  ),
);

// Selectors — pure functions kept outside Zustand to avoid derived-vs-source drift.

/** Sum of all item line totals. */
export function selectSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

/** Pre-tax total — discount applied. Stripe calculates tax at checkout. */
export function selectTotal(subtotal: number, discount: number): number {
  return Math.max(0, subtotal - discount);
}

/** Format a CAD dollar amount as "X.XX". */
export function formatCAD(amount: number): string {
  return amount.toFixed(2);
}
