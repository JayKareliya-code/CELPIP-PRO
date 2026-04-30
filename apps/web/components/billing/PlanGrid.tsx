"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PlanGrid.tsx — 3-column grid of plan cards (Starter / Pro / Ultra)
// ─────────────────────────────────────────────────────────────────────────────

import { Zap, Rocket, Trophy } from "lucide-react";
import { PlanCard } from "./PlanCard";
import type { PlanCardConfig } from "./PlanCard";
import type { BillingPlan } from "@/lib/hooks/useBilling";
import { PLAN_PRICING } from "@/lib/constants";

// ── Static plan configs ───────────────────────────────────────────────────────

const PLANS: PlanCardConfig[] = [
  {
    id:          "starter",
    name:        PLAN_PRICING.starter.name,
    tagline:     "Try it — no credit card needed",
    priceLabel:  PLAN_PRICING.starter.priceLabel,
    priceNote:   PLAN_PRICING.starter.priceNote,
    icon:        <Zap className="w-5 h-5 text-subtle" />,
    iconBg:      "bg-muted border border-border",
    highlighted: false,
    features: [
      { text: "1 Speaking mock test",            included: true  },
      { text: "1 Writing mock test",             included: true  },
      { text: "Basic estimated band score",      included: true  },
      { text: "Intro-level learning materials",  included: true  },
      { text: "Detailed AI feedback",            included: false },
      { text: "Individual task practice",        included: false },
      { text: "Attempt history & tracking",      included: false },
      { text: "Vocabulary & templates",          included: false },
    ],
  },
  {
    id:          "pro",
    name:        PLAN_PRICING.pro.name,
    tagline:     "For focused exam takers",
    priceLabel:  PLAN_PRICING.pro.priceLabel,
    priceNote:   PLAN_PRICING.pro.priceNote,
    icon:        <Rocket className="w-5 h-5 text-primary" />,
    iconBg:      "bg-primary/15",
    highlighted: true,
    badge:       "Most Popular",
    badgeColor:  "bg-primary",
    features: [
      { text: "5 attempts per Speaking Task (1–8)", included: true, highlight: true  },
      { text: "5 attempts per Writing Task (1–2)",  included: true, highlight: true  },
      { text: "2 full Speaking mock tests",          included: true                   },
      { text: "2 full Writing mock tests",           included: true                   },
      { text: "Full AI feedback — strengths & gaps", included: true, highlight: true  },
      { text: "Estimated band score per attempt",    included: true                   },
      { text: "Improved sample response",            included: true                   },
      { text: "Vocabulary, connectors & templates",  included: true                   },
      { text: "Attempt history & progress tracking", included: true                   },
      { text: "Advanced analytics & weak areas",     included: false                  },
    ],
  },
  {
    id:          "ultra",
    name:        PLAN_PRICING.ultra.name,
    tagline:     "Maximum score. No compromise.",
    priceLabel:  PLAN_PRICING.ultra.priceLabel,
    priceNote:   PLAN_PRICING.ultra.priceNote,
    icon:        <Trophy className="w-5 h-5 text-warning" />,
    iconBg:      "bg-warning/15",
    highlighted: false,
    comingSoon:  true,
    badge:       "Best Results",
    badgeColor:  "bg-warning/90",
    features: [
      { text: "15 attempts per Speaking Task (1–8)", included: true, highlight: true  },
      { text: "15 attempts per Writing Task (1–2)",  included: true, highlight: true  },
      { text: "5 full Speaking mock tests",           included: true                   },
      { text: "5 full Writing mock tests",            included: true                   },
      { text: "Advanced AI feedback + rewriting",     included: true, highlight: true  },
      { text: "Multiple sample responses",            included: true                   },
      { text: "Full learning materials & drills",     included: true                   },
      { text: "Advanced analytics & weak areas",      included: true, highlight: true  },
      { text: "Personalized study suggestions",       included: true                   },
      { text: "Idea generation & vocab drills",       included: true                   },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface PlanGridProps {
  currentPlan:   string;
  checkingOutPlan: BillingPlan | null;
  onUpgrade:     (plan: BillingPlan) => void;
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
