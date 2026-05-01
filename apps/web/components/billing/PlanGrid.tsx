"use client";

import { Rocket, Trophy, Zap } from "lucide-react";
import { PlanCard } from "./PlanCard";
import type { PlanCardConfig } from "./PlanCard";
import type { BillingPlan } from "@/lib/hooks/useBilling";
import { PLAN_PRICING, PRO_PLAN_LIMITS, ULTRA_PLAN_LIMITS } from "@/lib/constants";

const SPEAKING_TASK_COUNT = 8;
const WRITING_TASK_COUNT = 2;

const PLANS: PlanCardConfig[] = [
  {
    id: "starter",
    name: PLAN_PRICING.starter.name,
    tagline: "Try the workflow first",
    priceLabel: PLAN_PRICING.starter.priceLabel,
    priceNote: PLAN_PRICING.starter.priceNote,
    icon: <Zap className="w-5 h-5 text-subtle" />,
    iconBg: "bg-muted border border-border",
    highlighted: false,
    features: [
      { text: "1 Speaking mock test", included: true },
      { text: "1 Writing mock test", included: true },
      { text: "Basic estimated practice band", included: true },
      { text: "Intro-level learning materials", included: true },
      { text: "Detailed AI feedback", included: false },
      { text: "Individual task practice", included: false },
      { text: "Attempt history & tracking", included: false },
      { text: "Vocabulary & templates", included: false },
    ],
  },
  {
    id: "pro",
    name: PLAN_PRICING.pro.name,
    tagline: "The live plan for serious practice",
    priceLabel: PLAN_PRICING.pro.priceLabel,
    priceNote: PLAN_PRICING.pro.priceNote,
    icon: <Rocket className="w-5 h-5 text-primary" />,
    iconBg: "bg-primary/15",
    highlighted: true,
    badge: "Live Now",
    badgeColor: "bg-primary",
    features: [
      { text: `${SPEAKING_TASK_COUNT * PRO_PLAN_LIMITS.speaking_attempts_per_task} focused Speaking practices`, included: true, highlight: true },
      { text: `${WRITING_TASK_COUNT * PRO_PLAN_LIMITS.writing_attempts_per_task} focused Writing practices`, included: true, highlight: true },
      { text: `${PRO_PLAN_LIMITS.speaking_mock_tests} full Speaking mock tests`, included: true },
      { text: `${PRO_PLAN_LIMITS.writing_mock_tests} full Writing mock tests`, included: true },
      { text: "Detailed AI feedback: strengths & gaps", included: true, highlight: true },
      { text: "Estimated practice band per attempt", included: true },
      { text: "Improved sample response", included: true },
      { text: "Vocabulary, connectors & templates", included: true },
      { text: "Attempt history & progress tracking", included: true },
      { text: "Advanced analytics & deeper rewrite drills", included: false },
    ],
  },
  {
    id: "ultra",
    name: PLAN_PRICING.ultra.name,
    tagline: "Expanded practice depth is coming soon",
    priceLabel: PLAN_PRICING.ultra.priceLabel,
    priceNote: "Planned one-time price",
    icon: <Trophy className="w-5 h-5 text-warning" />,
    iconBg: "bg-warning/15",
    highlighted: false,
    comingSoon: true,
    badge: "Coming Soon",
    badgeColor: "bg-warning/90",
    features: [
      { text: `${SPEAKING_TASK_COUNT * ULTRA_PLAN_LIMITS.speaking_attempts_per_task} planned Speaking practices`, included: true, highlight: true },
      { text: `${WRITING_TASK_COUNT * ULTRA_PLAN_LIMITS.writing_attempts_per_task} planned Writing practices`, included: true, highlight: true },
      { text: `${ULTRA_PLAN_LIMITS.speaking_mock_tests} planned Speaking mock tests`, included: true },
      { text: `${ULTRA_PLAN_LIMITS.writing_mock_tests} planned Writing mock tests`, included: true },
      { text: "Advanced feedback + rewriting", included: true, highlight: true },
      { text: "Multiple sample responses", included: true },
      { text: "Advanced analytics & weak areas", included: true, highlight: true },
      { text: "Personalized study suggestions", included: true },
      { text: "Idea generation & vocab drills", included: true },
      { text: "Checkout not available yet", included: false },
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
    <div id="plans" className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start scroll-mt-8">
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
