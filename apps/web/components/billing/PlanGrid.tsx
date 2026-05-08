"use client";

import { Rocket, Zap } from "lucide-react";
import { PlanCard } from "./PlanCard";
import type { PlanCardConfig } from "./PlanCard";
import type { BillingPlan } from "@/lib/hooks/useBilling";
import { PLAN_PRICING, PRO_PLAN_LIMITS } from "@/lib/constants";

const SPEAKING_TASK_COUNT = 8;
const WRITING_TASK_COUNT  = 2;

export const PLANS: PlanCardConfig[] = [
  {
    id: "starter",
    name: PLAN_PRICING.starter.name,
    tagline: "Try the workflow first",
    priceLabel: PLAN_PRICING.starter.priceLabel,
    priceNote: PLAN_PRICING.starter.priceNote,
    icon: <Zap className="w-5 h-5 text-white/35" />,
    iconBg: "border-white/[0.10] bg-transparent",
    highlighted: false,
    features: [
      { text: "Band estimation only",    included: true },
      { text: "Practice access",         included: true },
      { text: "Basic results",           included: true },
      { text: "Detailed AI report",      included: false },
      { text: "Strengths & weaknesses",  included: false },
      { text: "Improvement tips",        included: false },
      { text: "Sample response",         included: false },
      { text: "Analytics",               included: false },
    ],
  },
  {
    id: "pro",
    name: PLAN_PRICING.pro.name,
    tagline: "The live plan for serious practice",
    priceLabel: PLAN_PRICING.pro.priceLabel,
    priceNote: PLAN_PRICING.pro.priceNote,
    icon: <Rocket className="w-5 h-5 text-amber-400" />,
    iconBg: "border-white/[0.10] bg-transparent",
    highlighted: true,
    badge: "Most Popular",
    badgeColor: "bg-amber-500",
    features: [
      { text: `${SPEAKING_TASK_COUNT * PRO_PLAN_LIMITS.speaking_attempts_per_task} focused Speaking practices`, included: true, highlight: true },
      { text: `${WRITING_TASK_COUNT  * PRO_PLAN_LIMITS.writing_attempts_per_task}  focused Writing practices`,  included: true, highlight: true },
      { text: "Detailed AI report",      included: true, highlight: true },
      { text: "Strengths & weaknesses",  included: true },
      { text: "Improvement tips",        included: true },
      { text: "Sample response",         included: true },
      { text: "Analytics",               included: true },
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
