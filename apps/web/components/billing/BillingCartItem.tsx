"use client";

// ─────────────────────────────────────────────────────────────────────────────
// BillingCartItem.tsx — Single cart row
//
// Layout (redesigned per UX audit):
//   ┌─────────────────────────────────────────────────┐
//   │ [Category pill]               $1.99 CAD   [✕]  │
//   │ Task 4 — Making Predictions                     │
//   │ − 1 + (hidden for plan type)                    │
//   └─────────────────────────────────────────────────┘
//
// Each item is wrapped in its own card shell for clear visual separation.
// The category pill replaces the abstract colour-dot indicator.
// The stepper is only shown for purchasable-quantity types (not plan).
//
// IDs follow the test automation spec:
//   billing-cart-item-{itemId}-increase
//   billing-cart-item-{itemId}-decrease
//   billing-cart-item-{itemId}-remove
// ─────────────────────────────────────────────────────────────────────────────

import { X } from "lucide-react";
import { QuantityStepper } from "./QuantityStepper";
import { formatCAD } from "@/store/billingCartStore";
import type { CartItem } from "@/store/billingCartStore";
import { cn } from "@/lib/utils";

// ── Category pill metadata per item type ──────────────────────────────────────

const TYPE_META: Record<
  CartItem["type"],
  { label: string; textColor: string; bgColor: string; borderColor: string }
> = {
  plan: {
    label:       "Subscription Plan",
    textColor:   "text-primary",
    bgColor:     "bg-primary/10",
    borderColor: "border-primary/20",
  },
  writing_pack: {
    label:       "Writing Pack",
    textColor:   "text-blue-400",
    bgColor:     "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  speaking_pack: {
    label:       "Speaking Pack",
    textColor:   "text-emerald-400",
    bgColor:     "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  custom_bundle: {
    label:       "Task Bundle",
    textColor:   "text-amber-400",
    bgColor:     "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
};

interface BillingCartItemProps {
  item: CartItem;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove:   (id: string) => void;
}

export function BillingCartItem({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}: BillingCartItemProps) {
  const meta      = TYPE_META[item.type] ?? TYPE_META.plan;
  const lineTotal = item.unitPrice * item.quantity;
  const showStepper = item.type !== "plan";

  return (
    // ── Card shell — gives each item a distinct visual boundary ───────────────
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 space-y-2.5">

      {/* ── Row 1: Category pill + Price + Remove ─────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        {/* Category pill — self-labelled, replaces the abstract colour dot */}
        <span
          className={cn(
            "inline-flex items-center text-[10px] font-semibold uppercase tracking-wider",
            "px-2 py-0.5 rounded-full border",
            meta.bgColor,
            meta.textColor,
            meta.borderColor,
          )}
        >
          {meta.label}
        </span>

        {/* Price + remove — top-right so eyes don't need to travel */}
        <div className="flex items-center gap-2.5 shrink-0">
          <p className="text-sm font-semibold text-foreground tabular-nums">
            ${formatCAD(lineTotal)}{" "}
            <span className="text-xs font-normal text-subtle">CAD</span>
          </p>
          <button
            id={`billing-cart-item-${item.id}-remove`}
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.name} from cart`}
            className="text-subtle/40 hover:text-danger transition-colors p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Row 2: Task name (primary label, promoted from subtitle) ──────── */}
      <p className="text-sm font-medium text-foreground leading-snug">
        {item.subtitle}
      </p>

      {/* ── Row 3: Quantity stepper (hidden for plan-type items) ──────────── */}
      {showStepper && (
        <QuantityStepper
          id={`billing-cart-item-${item.id}`}
          value={item.quantity}
          onIncrease={() => onIncrease(item.id)}
          onDecrease={() => onDecrease(item.id)}
        />
      )}
    </div>
  );
}
