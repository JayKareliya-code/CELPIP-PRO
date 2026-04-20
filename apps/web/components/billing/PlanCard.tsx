"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PlanCard.tsx — Individual plan card for the billing page
// Mirrors landing PricingPreview but with live checkout integration.
// ─────────────────────────────────────────────────────────────────────────────

import { Check, X, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BillingPlan } from "@/lib/hooks/useBilling";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlanFeature {
  text:       string;
  included:   boolean;
  highlight?: boolean;
}

export interface PlanCardConfig {
  id:         "starter" | BillingPlan;
  name:       string;
  tagline:    string;
  priceLabel: string;
  priceNote:  string;
  icon:       React.ReactNode;
  iconBg:     string;
  features:   PlanFeature[];
  badge?:     string;
  badgeColor?: string;
  highlighted: boolean;
}

interface PlanCardProps {
  plan:         PlanCardConfig;
  /** User's current plan key */
  currentPlan:  string;
  /** Is a checkout in-flight for this specific plan? */
  isCheckingOut: boolean;
  /** Trigger Stripe Checkout for this plan */
  onUpgrade:    (plan: BillingPlan) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlanCard({ plan, currentPlan, isCheckingOut, onUpgrade }: PlanCardProps) {
  const isCurrent  = plan.id === currentPlan;
  const isStarter  = plan.id === "starter";
  // Allow upgrade only to a higher plan
  const planOrder  = { starter: 0, pro: 1, ultra: 2 } as Record<string, number>;
  const canUpgrade = !isStarter && !isCurrent && (planOrder[plan.id] ?? 0) > (planOrder[currentPlan] ?? 0);

  return (
    <div
      id={`billing-plan-${plan.id}`}
      className={cn(
        "relative rounded-2xl border flex flex-col gap-5 transition-all duration-200 overflow-hidden p-6",
        plan.highlighted && !isCurrent
          ? "bg-primary/10 border-primary/40 shadow-[0_0_50px_rgba(99,102,241,0.12)] scale-[1.02]"
          : isCurrent
            ? "bg-surface border-success/30 shadow-[0_0_30px_rgba(34,197,94,0.08)]"
            : "bg-surface border-border hover:border-primary/25",
      )}
    >
      {/* ── Badge ─────────────────────────────────────────────────────────── */}
      {isCurrent ? (
        <div className="absolute top-0 right-0">
          <div className="bg-success text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl tracking-wide">
            Current Plan
          </div>
        </div>
      ) : plan.badge ? (
        <div className="absolute top-0 right-0">
          <div className={cn(plan.badgeColor, "text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl tracking-wide")}>
            {plan.badge}
          </div>
        </div>
      ) : null}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", plan.iconBg)}>
          {plan.icon}
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
          <p className="text-sm text-subtle">{plan.tagline}</p>
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-foreground">{plan.priceLabel}</span>
            {plan.priceLabel !== "Free" && (
              <span className="text-subtle text-sm">CAD</span>
            )}
          </div>
          <p className="text-xs text-subtle mt-0.5">{plan.priceNote}</p>
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div className="border-t border-border" />

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <ul className="space-y-2.5 flex-1">
        {plan.features.map((feat) => (
          <li
            key={feat.text}
            className={cn(
              "flex items-start gap-2.5 text-sm",
              feat.included
                ? feat.highlight
                  ? "text-foreground font-medium"
                  : "text-foreground/80"
                : "text-subtle/40",
            )}
          >
            {feat.included ? (
              <Check className={cn("w-4 h-4 flex-shrink-0 mt-0.5", feat.highlight ? "text-success" : "text-success/70")} />
            ) : (
              <X className="w-4 h-4 flex-shrink-0 mt-0.5 text-subtle/30" />
            )}
            {feat.text}
          </li>
        ))}
      </ul>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      {isCurrent ? (
        <div className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-success/10 border border-success/30 text-success text-sm font-semibold cursor-default select-none">
          ✓ Active Plan
        </div>
      ) : isStarter ? (
        <div className="inline-flex items-center justify-center w-full py-3.5 rounded-xl bg-surface border border-border text-subtle text-sm font-medium cursor-default select-none">
          Always Free
        </div>
      ) : canUpgrade ? (
        <button
          id={`billing-upgrade-${plan.id}`}
          onClick={() => onUpgrade(plan.id as BillingPlan)}
          disabled={isCheckingOut}
          className={cn(
            "inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200",
            plan.highlighted
              ? "bg-primary text-white hover:bg-primary-hover btn-glow disabled:opacity-60"
              : "bg-warning/10 border border-warning/40 text-warning hover:bg-warning/20 disabled:opacity-60",
          )}
        >
          {isCheckingOut ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
          ) : (
            <>Upgrade to {plan.name} <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      ) : (
        <div className="inline-flex items-center justify-center w-full py-3.5 rounded-xl bg-surface border border-border text-subtle/50 text-sm cursor-default select-none">
          Not available
        </div>
      )}
    </div>
  );
}
