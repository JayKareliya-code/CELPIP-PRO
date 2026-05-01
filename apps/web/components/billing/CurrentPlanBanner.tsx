"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, Rocket, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRO_PLAN_LIMITS, ULTRA_PLAN_LIMITS } from "@/lib/constants";
import type { UserPlan } from "@/lib/types";
import type { BillingStatus } from "@/lib/hooks/useBilling";

const PLAN_META: Record<
  UserPlan,
  { label: string; tagline: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  starter: {
    label: "Starter",
    tagline: "You're on the free plan. Upgrade to Pro to unlock full task practice and detailed AI feedback.",
    icon: <Zap className="w-5 h-5" />,
    color: "text-white/50",
    bg: "bg-white/[0.04]",
    border: "border-white/[0.08]",
  },
  pro: {
    label: "Pro",
    tagline: `You have ${PRO_PLAN_LIMITS.speaking_attempts_per_task} practices per Speaking task, ${PRO_PLAN_LIMITS.writing_attempts_per_task} practices per Writing task, detailed AI feedback, and progress tracking.`,
    icon: <Rocket className="w-5 h-5" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  ultra: {
    label: "Ultra",
    tagline: `Ultra access includes ${ULTRA_PLAN_LIMITS.speaking_attempts_per_task} practices per Speaking task, advanced analytics, and personalized suggestions.`,
    icon: <Trophy className="w-5 h-5" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
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
        "rounded-2xl border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4",
        meta.bg,
        meta.border,
      )}
    >
      <div
        className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
          meta.bg,
          "border",
          meta.border,
        )}
      >
        <span className={meta.color}>{meta.icon}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-semibold text-subtle uppercase tracking-widest">Current Plan</p>
        </div>
        <h2 className={cn("text-xl font-bold", meta.color)}>{meta.label}</h2>
        <p className="text-sm text-subtle mt-1 leading-relaxed">{meta.tagline}</p>
      </div>

      <div className="flex flex-col sm:items-end gap-2 shrink-0">
        {plan === "starter" && (
          <Link
            href="#plans"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors btn-glow"
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm text-subtle hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {isOpeningPortal ? "Opening..." : "View Receipts"}
          </button>
        )}
      </div>
    </div>
  );
}
