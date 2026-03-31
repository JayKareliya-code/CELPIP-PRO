import Link from "next/link";
import { Check, X, Rocket, Trophy, Zap, ArrowRight, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAN_PRICING, PRO_PLAN_LIMITS, ULTRA_PLAN_LIMITS } from "@/lib/constants";

interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

interface Plan {
  id: string;
  name: string;
  tagline: string;
  priceLabel: string;
  priceNote: string;
  icon: React.ReactNode;
  iconBg: string;
  features: PlanFeature[];
  cta: string;
  ctaHref: string;
  highlighted: boolean;
  badge?: string;
  badgeColor?: string;
}

const PLANS: Plan[] = [
  {
    id:         PLAN_PRICING.starter.id,
    name:       PLAN_PRICING.starter.name,
    tagline:    "Try it — no credit card needed",
    priceLabel: PLAN_PRICING.starter.priceLabel,
    priceNote:  PLAN_PRICING.starter.priceNote,
    icon:    <Zap className="w-5 h-5 text-subtle" />,
    iconBg:  "bg-muted border border-border",
    highlighted: false,
    cta:     "Start for Free",
    ctaHref: "/sign-up",
    features: [
      { text: "1 Speaking mock test",           included: true  },
      { text: "1 Writing mock test",            included: true  },
      { text: "Basic estimated band score",     included: true  },
      { text: "Intro-level learning materials", included: true  },
      { text: "Detailed AI feedback",           included: false },
      { text: "Individual task practice",       included: false },
      { text: "Attempt history & tracking",     included: false },
      { text: "Vocabulary & templates",         included: false },
    ],
  },
  {
    id:         PLAN_PRICING.pro.id,
    name:       PLAN_PRICING.pro.name,
    tagline:    "For focused exam takers",
    priceLabel: PLAN_PRICING.pro.priceLabel,
    priceNote:  PLAN_PRICING.pro.priceNote,
    icon:    <Rocket className="w-5 h-5 text-primary" />,
    iconBg:  "bg-primary/15",
    highlighted: true,
    badge:      "Most Popular",
    badgeColor: "bg-primary",
    cta:     `Get ${PLAN_PRICING.pro.name}`,
    ctaHref: "/sign-up?plan=pro",
    features: [
      { text: "5 attempts per Speaking Task (Tasks 1–8)", included: true, highlight: true },
      { text: "5 attempts per Writing Task (Tasks 1–2)",  included: true, highlight: true },
      { text: "2 full Speaking mock tests",               included: true },
      { text: "2 full Writing mock tests",                included: true },
      { text: "Full AI feedback — strengths & weaknesses",included: true, highlight: true },
      { text: "Estimated band score per attempt",         included: true },
      { text: "Improved sample response",                 included: true },
      { text: "Vocabulary, connectors & templates",       included: true },
      { text: "Attempt history & progress tracking",      included: true },
      { text: "Advanced analytics & weak-area detection", included: false },
    ],
  },
  {
    id:         PLAN_PRICING.ultra.id,
    name:       PLAN_PRICING.ultra.name,
    tagline:    "Maximum score. No compromise.",
    priceLabel: PLAN_PRICING.ultra.priceLabel,
    priceNote:  PLAN_PRICING.ultra.priceNote,
    icon:    <Trophy className="w-5 h-5 text-warning" />,
    iconBg:  "bg-warning/15",
    highlighted: false,
    badge:      "Best Results",
    badgeColor: "bg-warning/90",
    cta:     `Go ${PLAN_PRICING.ultra.name}`,
    ctaHref: "/sign-up?plan=ultra",
    features: [
      { text: "15 attempts per Speaking Task (Tasks 1–8)", included: true, highlight: true },
      { text: "15 attempts per Writing Task (Tasks 1–2)",  included: true, highlight: true },
      { text: "5 full Speaking mock tests",                included: true },
      { text: "5 full Writing mock tests",                 included: true },
      { text: "Advanced AI feedback + rewriting",          included: true, highlight: true },
      { text: "Multiple sample responses per attempt",     included: true },
      { text: "Full learning materials + drill practice",  included: true },
      { text: "Advanced analytics & weak-area detection",  included: true, highlight: true },
      { text: "Personalized study suggestions",            included: true },
      { text: "Idea generation & vocabulary drills",       included: true },
    ],
  },
];


/**
 * PricingPreview — Starter / Score Booster Pro / Band Achiever Ultra.
 * One-time payment model, attempt-based, aligned with exam-prep usage patterns.
 *
 * All attempt counts and multipliers are derived from constants.ts so that
 * updating a plan limit automatically updates the comparison copy below.
 */
export function PricingPreview() {
  // Derive the attempt multiplier from constants — no hardcoded strings
  const attemptsMultiplier = Math.round(
    ULTRA_PLAN_LIMITS.speaking_attempts_per_task /
    PRO_PLAN_LIMITS.speaking_attempts_per_task
  );

  const COMPARISON_NOTES = [
    {
      label: "Starter vs Pro",
      text:  "Pro unlocks all 8 Speaking tasks, detailed AI feedback, and history tracking.",
    },
    {
      label: "Pro vs Ultra",
      text:  `Ultra gives ${attemptsMultiplier}× more attempts per task, advanced rewriting, and personalized analytics.`,
    },
    {
      label: "Why one-time?",
      text:  "Exam prep is a sprint, not a marathon. Pay once, focus on your exam, done.",
    },
  ];

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-surface/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-5">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            Transparent Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Start Free. Upgrade When You&apos;re Ready.
          </h2>
          <p className="mt-4 text-subtle text-lg leading-relaxed">
            The Starter plan is always free — no credit card, no catch.
            If you want more attempts and detailed AI feedback, our paid
            plans are a single one-time purchase. No subscriptions, ever.
          </p>
        </div>

        {/* Urgency nudge */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/25 text-warning text-sm font-medium">
            <Flame className="w-4 h-4" />
            Most users improve 2+ bands in under 4 weeks with Score Booster
          </div>
        </div>

        {/* ── Plan cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              id={`plan-${plan.id}`}
              className={cn(
                "relative rounded-2xl border flex flex-col gap-6 transition-all duration-200 overflow-hidden",
                plan.highlighted
                  ? "bg-primary/10 border-primary/40 shadow-[0_0_50px_rgba(99,102,241,0.15)] p-7 scale-[1.02]"
                  : "bg-surface border-border hover:border-primary/30 p-7"
              )}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-0 right-0">
                  <div
                    className={`${plan.badgeColor} text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl tracking-wide`}
                  >
                    {plan.badge}
                  </div>
                </div>
              )}

              {/* Plan header */}
              <div className="space-y-3">
                <div className={`w-10 h-10 rounded-xl ${plan.iconBg} flex items-center justify-center`}>
                  {plan.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-subtle">{plan.tagline}</p>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold text-foreground">
                      {plan.priceLabel}
                    </span>
                    {plan.priceLabel !== "Free" && (
                      <span className="text-subtle text-sm">CAD</span>
                    )}
                  </div>
                  <p className="text-xs text-subtle mt-0.5">{plan.priceNote}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Features */}
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
                        : "text-subtle/40"
                    )}
                  >
                    {feat.included ? (
                      <Check
                        className={cn(
                          "w-4 h-4 flex-shrink-0 mt-0.5",
                          feat.highlight ? "text-success" : "text-success/70"
                        )}
                      />
                    ) : (
                      <X className="w-4 h-4 flex-shrink-0 mt-0.5 text-subtle/30" />
                    )}
                    {feat.text}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                id={`plan-cta-${plan.id}`}
                href={plan.ctaHref}
                className={cn(
                  "inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200",
                  plan.highlighted
                    ? "bg-primary text-white hover:bg-primary-hover btn-glow"
                    : plan.id === "ultra"
                    ? "bg-warning/10 border border-warning/40 text-warning hover:bg-warning/20"
                    : "bg-surface border border-border text-foreground hover:border-primary/40"
                )}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        {/* ── Comparison note ─────────────────────────────────────────── */}
        <div className="mt-10 rounded-2xl bg-surface border border-border p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {COMPARISON_NOTES.map(({ label, text }) => (
            <div key={label} className="space-y-1">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">{label}</p>
              <p className="text-sm text-subtle leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-subtle mt-6">
          Prices in CAD. Paid plans are a one-time purchase — no subscription, no renewal.
          Starter plan is free forever. Not affiliated with Paragon Testing Enterprises.
        </p>
      </div>
    </section>
  );
}
