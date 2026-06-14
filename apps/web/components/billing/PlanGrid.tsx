"use client";

import { Rocket, Zap } from "lucide-react";
import { PlanCard } from "./PlanCard";
import type { PlanCardConfig } from "./PlanCard";
import type { BillingPlan } from "@/lib/hooks/useBilling";
import { PLAN_PRICING, PRO_PLAN_LIMITS, STARTER_PLAN_LIMITS } from "@/lib/constants";

const SPEAKING_TASK_COUNT = 8;
const WRITING_TASK_COUNT = 2;

export const PLANS: PlanCardConfig[] = [
  {
    id: "starter",
    name: PLAN_PRICING.starter.name,
    tagline: "Try the workflow first",
    priceLabel: PLAN_PRICING.starter.priceLabel,
    priceNote: PLAN_PRICING.starter.priceNote,
    icon: <Zap className="w-5 h-5 text-primary" />,
    iconBg: "border-white/[0.10] bg-transparent",
    highlighted: false,
    features: [
      { text: `${SPEAKING_TASK_COUNT * STARTER_PLAN_LIMITS.speaking_attempts_per_task} Focused Speaking practices`, included: true, highlight: true },
      { text: `${WRITING_TASK_COUNT * STARTER_PLAN_LIMITS.writing_attempts_per_task} Focused Writing practices`, included: true, highlight: true },
      { text: "1 Full Mock Test", included: true, highlight: true },
      { text: "Basic Estimate Band Score", included: true, highlight: true },
      { text: "Retry credits", included: false, highlight: true },
      { text: "Detailed rubric-style scoring", included: false, highlight: true },
      { text: "Targeted rewrite response", included: false, highlight: true },
      { text: "Progress Tracking", included: false, highlight: true },
      { text: "Analytics", included: false, highlight: true },
    ],
  },
  {
    id: "pro",
    name: PLAN_PRICING.pro.name,
    tagline: "Unlocks advanced features",
    priceLabel: PLAN_PRICING.pro.priceLabel,
    priceNote: PLAN_PRICING.pro.priceNote,
    icon: <Rocket className="w-5 h-5 text-primary" />,
    iconBg: "border-white/[0.10] bg-transparent",
    highlighted: true,
    features: [
      { text: `${SPEAKING_TASK_COUNT * PRO_PLAN_LIMITS.speaking_attempts_per_task} Focused Speaking practices`, included: true, highlight: true },
      { text: `${WRITING_TASK_COUNT * PRO_PLAN_LIMITS.writing_attempts_per_task} Focused Writing practices`, included: true, highlight: true },
      { text: "2 Full Mock Tests", included: true, highlight: true },
      { text: "Advanced AI Feedback", included: true, highlight: true },
      { text: "70 Retry credits", included: true, highlight: true },
      { text: "Detailed rubric-style scoring", included: true, highlight: true },
      { text: "Targeted rewrite response", included: true, highlight: true },
      { text: "Progress Tracking", included: true, highlight: true },
      { text: "Analytics", included: true, highlight: true },
    ],
  },
];

interface PlanGridProps {
  currentPlan: string;
  checkingOutPlan: BillingPlan | null;
  onUpgrade: (plan: BillingPlan) => void;
}

export function PlanGrid({ currentPlan, checkingOutPlan, onUpgrade }: PlanGridProps) {
  return (
    <div
      id="plans"
      className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch scroll-mt-8 max-w-3xl mx-auto"
    >
      {PLANS.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          currentPlan={currentPlan}
          isCheckingOut={checkingOutPlan === plan.id}
          onUpgrade={onUpgrade}
        />
      ))}
    </div>
  );
}
