"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, Rocket, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRO_PLAN_LIMITS } from "@/lib/constants";
import type { UserPlan } from "@/lib/types";
import type { BillingStatus } from "@/lib/hooks/useBilling";

const PLAN_META: Record<
  "starter" | "pro",
  { label: string; tagline: string; icon: React.ReactNode; accentText: string; accentBorder: string }
> = {
  starter: {
    label: "Starter",
    tagline: "You're on the free plan. Upgrade to Pro to unlock full task practice and detailed AI feedback.",
    icon: <Zap className="w-5 h-5" />,
    accentText:   "text-white/50",
    accentBorder: "border-white/[0.10]",
  },
  pro: {
    label: "Pro",
    tagline: `You have ${PRO_PLAN_LIMITS.speaking_attempts_per_task} practices per Speaking task, ${PRO_PLAN_LIMITS.writing_attempts_per_task} practices per Writing task, detailed AI feedback, and progress tracking.`,
    icon: <Rocket className="w-5 h-5" />,
    accentText:   "text-primary",
    accentBorder: "border-primary/30",
  },
};

interface CurrentPlanBannerProps {
  plan: UserPlan;
  billingStatus?: BillingStatus | null;
  onOpenPortal: () => void;
  isOpeningPortal: boolean;
}

export function CurrentPlanBanner({
  plan,
  billingStatus,
  onOpenPortal,
  isOpeningPortal,
}: CurrentPlanBannerProps) {
  const meta = PLAN_META[plan] ?? PLAN_META.starter;
  const hasPurchase = billingStatus?.has_active_purchase ?? false;

  return (
    <div
      className={cn(
        "rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-4 px-5 py-4",
        meta.accentBorder,
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border",
          meta.accentBorder,
        )}
      >
        <span className={meta.accentText}>{meta.icon}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-white/45 uppercase tracking-widest mb-0.5">Current Plan</p>
        <h2 className={cn("text-lg font-bold", meta.accentText)}>{meta.label}</h2>
        <p className="text-sm text-white/55 mt-0.5 leading-relaxed">{meta.tagline}</p>
      </div>

      <div className="flex flex-col sm:items-end gap-2 shrink-0">
        {plan === "starter" && (
          <Link
            href="#plans"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors btn-glow"
          >
            Upgrade to Pro
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
        {hasPurchase && (
          <button
            id="billing-portal-btn"
            onClick={onOpenPortal}
            disabled={isOpeningPortal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/[0.14] text-sm text-white/50 hover:text-white/75 hover:border-white/[0.22] transition-colors disabled:opacity-50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {isOpeningPortal ? "Opening..." : "View Receipts"}
          </button>
        )}
      </div>
    </div>
  );
}
