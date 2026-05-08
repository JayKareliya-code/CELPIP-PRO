"use client";

// ─────────────────────────────────────────────────────────────────────────────
// BillingTrustStrip.tsx — Secure-checkout trust notes
//
// Extracted from BillingPageClient into its own component so it can live
// inside the cart panel. Three compact trust items below the checkout button.
// ─────────────────────────────────────────────────────────────────────────────

import { Lock, RotateCcw, Zap } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: Lock,
    label: "Secure checkout",
    body: "Your data is safe and encrypted.",
  },
  {
    icon: RotateCcw,
    label: "One-time purchase",
    body: "No recurring charges.",
  },
  {
    icon: Zap,
    label: "Instant access",
    body: "Get started right away.",
  },
] as const;

export function BillingTrustStrip() {
  return (
    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
      {TRUST_ITEMS.map(({ icon: Icon, label, body }) => (
        <div key={label} className="flex flex-col items-center text-center gap-1">
          <Icon className="w-3.5 h-3.5 text-subtle" />
          <p className="text-[10px] font-semibold text-subtle leading-tight">{label}</p>
          <p className="text-[10px] text-subtle/60 leading-tight">{body}</p>
        </div>
      ))}
    </div>
  );
}
