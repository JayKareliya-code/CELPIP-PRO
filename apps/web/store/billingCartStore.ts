import { create } from "zustand";

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
  items:         CartItem[];
  promoCode:     string | null;
  promoDiscount: number;

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

export const useBillingCartStore = create<BillingCartState>((set, get) => ({
  items: [],
  promoCode: null,
  promoDiscount: 0,

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
  clearCart:  ()   => set({ items: [] }),
  applyPromo: (code, discount) => set({ promoCode: code, promoDiscount: discount }),
  clearPromo: ()   => set({ promoCode: null, promoDiscount: 0 }),
}));

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
