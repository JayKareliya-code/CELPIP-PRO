"use client";

import { ArrowRight, Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BillingPlan } from "@/lib/hooks/useBilling";

export interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface PlanCardConfig {
  id: "starter" | BillingPlan;
  name: string;
  tagline: string;
  priceLabel: string;
  priceNote: string;
  icon: React.ReactNode;
  iconBg: string;
  features: PlanFeature[];
  badge?: string;
  badgeColor?: string;
  highlighted: boolean;
  comingSoon?: boolean;
}

interface PlanCardProps {
  plan: PlanCardConfig;
  currentPlan: string;
  isCheckingOut: boolean;
  onUpgrade: (plan: BillingPlan) => void;
}

export function PlanCard({ plan, currentPlan, isCheckingOut, onUpgrade }: PlanCardProps) {
  const isCurrent = plan.id === currentPlan;
  const isStarter = plan.id === "starter";
  const planOrder = { starter: 0, pro: 1 } as Record<string, number>;
  const canUpgrade =
    !plan.comingSoon &&
    !isStarter &&
    !isCurrent &&
    (planOrder[plan.id] ?? 0) > (planOrder[currentPlan] ?? 0);

  return (
    <div
      id={`billing-plan-${plan.id}`}
      className={cn(
        "relative rounded-xl border flex flex-col gap-5 transition-all duration-200 overflow-hidden p-6 h-full bg-surface",
        "border-white/[0.14] hover:border-white/[0.22]",
        plan.highlighted && !isCurrent && "shadow-[0_0_30px_rgba(245,158,11,0.07)]",
        plan.comingSoon && "opacity-75",
      )}
    >
      {/* Corner badge */}
      {isCurrent ? (
        <div className="absolute top-0 right-0">
          <div className="bg-primary/20 text-primary text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl tracking-widest uppercase border-l border-b border-primary/20">
            Current Plan
          </div>
        </div>
      ) : plan.comingSoon ? (
        <div className="absolute top-0 right-0">
          <div className="bg-white/[0.05] text-white/35 text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl tracking-widest uppercase border-l border-b border-white/[0.10]">
            Coming Soon
          </div>
        </div>
      ) : plan.badge ? (
        <div className="absolute top-0 right-0">
          <div className="bg-primary/20 text-primary text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl tracking-widest uppercase border-l border-b border-primary/20">
            {plan.badge}
          </div>
        </div>
      ) : null}

      {/* Header block */}
      <div className="space-y-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", plan.iconBg)}>
          {plan.icon}
        </div>
        <div>
          <h3 className="text-base font-bold text-white/90">{plan.name}</h3>
          <p className="text-sm text-white/50 mt-0.5">{plan.tagline}</p>
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className={cn("text-4xl font-extrabold", plan.comingSoon ? "text-white/40" : "text-white/90")}>
              {plan.priceLabel}
            </span>
            {plan.priceLabel !== "Free" && (
              <span className="text-xs text-white/50">CAD</span>
            )}
          </div>
          <p className="text-xs text-white/50 mt-1">{plan.priceNote}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.10]" />

      {/* Features list */}
      <ul className="space-y-2.5 flex-1">
        {plan.features.map((feat) => (
          <li
            key={feat.text}
            className={cn(
              "flex items-start gap-2.5 text-sm",
              feat.included
                ? feat.highlight
                  ? "text-white/85 font-medium"
                  : "text-white/60"
                : "text-white/35",
            )}
          >
            {feat.included ? (
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
            ) : (
              <X className="w-4 h-4 flex-shrink-0 mt-0.5 text-white/30" />
            )}
            {feat.text}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {plan.comingSoon ? (
        <div
          id={`billing-plan-${plan.id}-coming-soon`}
          className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-white/[0.10] text-white/25 text-sm font-medium cursor-not-allowed select-none"
          aria-disabled="true"
        >
          Coming Soon
        </div>
      ) : isCurrent ? (
        <div className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-primary/30 text-primary text-sm font-medium cursor-default select-none">
          Active Plan
        </div>
      ) : isStarter ? (
        <div className="inline-flex items-center justify-center w-full py-3 rounded-lg border border-white/[0.14] text-white/50 text-sm font-medium cursor-default select-none">
          Always Free
        </div>
      ) : canUpgrade ? (
        <button
          id={`billing-upgrade-${plan.id}`}
          onClick={() => onUpgrade(plan.id as BillingPlan)}
          disabled={isCheckingOut}
          className={cn(
            "inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg font-semibold text-sm transition-all duration-200",
            "bg-primary hover:bg-primary-hover text-primary-foreground btn-glow",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
          )}
        >
          {isCheckingOut ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Upgrade to {plan.name}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      ) : (
        <div className="inline-flex items-center justify-center w-full py-3 rounded-lg border border-white/[0.14] text-white/40 text-sm cursor-default select-none">
          Not available
        </div>
      )}
    </div>
  );
}
