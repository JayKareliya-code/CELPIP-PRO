import Link from "next/link";
import { ArrowRight, Check, Rocket, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAN_PRICING, PRO_PLAN_LIMITS } from "@/lib/constants";

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

const SPEAKING_TASK_COUNT = 8;
const WRITING_TASK_COUNT  = 2;
const PRO_SPEAKING_PRACTICES =
  SPEAKING_TASK_COUNT * PRO_PLAN_LIMITS.speaking_attempts_per_task;
const PRO_WRITING_PRACTICES =
  WRITING_TASK_COUNT * PRO_PLAN_LIMITS.writing_attempts_per_task;

const PLANS: Plan[] = [
  {
    id: PLAN_PRICING.starter.id,
    name: PLAN_PRICING.starter.name,
    tagline: "Try it free — no credit card needed",
    priceLabel: PLAN_PRICING.starter.priceLabel,
    priceNote: PLAN_PRICING.starter.priceNote,
    icon: <Zap className="w-5 h-5 text-subtle" />,
    iconBg: "bg-muted border border-border",
    highlighted: false,
    cta: "Start Free",
    ctaHref: "/sign-up",
    features: [
      { text: "Band estimation only",               included: true  },
      { text: "Practice access",                    included: true  },
      { text: "Basic results",                      included: true  },
      { text: "Detailed AI feedback",               included: false },
      { text: "Strengths & weaknesses",             included: false },
      { text: "Improvement tips",                   included: false },
      { text: "Sample response",                    included: false },
      { text: "Analytics",                          included: false },
    ],
  },
  {
    id: PLAN_PRICING.pro.id,
    name: PLAN_PRICING.pro.name,
    tagline: "Everything you need to reach your target band",
    priceLabel: PLAN_PRICING.pro.priceLabel,
    priceNote: PLAN_PRICING.pro.priceNote,
    icon: <Rocket className="w-5 h-5 text-primary" />,
    iconBg: "bg-primary/15",
    highlighted: true,
    badge: "Most Popular",
    badgeColor: "bg-primary",
    cta: `Unlock ${PLAN_PRICING.pro.name}`,
    ctaHref: "/sign-up?plan=pro",
    features: [
      { text: `${PRO_SPEAKING_PRACTICES} Speaking practices across all 8 task types`, included: true, highlight: true },
      { text: `${PRO_WRITING_PRACTICES} Writing practices across both task types`,     included: true, highlight: true },
      { text: "Detailed AI report",                                                   included: true, highlight: true },
      { text: "Strengths & weaknesses",                                               included: true },
      { text: "Improvement tips",                                                     included: true },
      { text: "Sample response",                                                      included: true },
      { text: "Analytics",                                                            included: true },
    ],
  },
];

export function PricingPreview() {
  const COMPARISON_NOTES = [
    {
      label: "Starter vs Pro",
      text: "Starter lets you try the workflow for free. Pro unlocks individual task practice, detailed AI feedback, and progress tracking.",
    },
    {
      label: "Monthly subscription",
      text: `Pro is ${PLAN_PRICING.pro.priceLabel} CAD/month. Cancel any time. Add-ons let you buy extra practice packs without changing your plan.`,
    },
    {
      label: "Practice add-ons",
      text: "Pro subscribers can buy Writing, Speaking, or Custom Task bundles to get more focused practice exactly where they need it.",
    },
  ];

  return (
    <section id="pricing" className="py-16 sm:py-28 bg-surface/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-5">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            Transparent Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Start Free. Unlock Full Practice When You&apos;re Ready.
          </h2>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:overflow-visible sm:pb-0 sm:grid sm:grid-cols-2 sm:gap-6 items-start -mx-4 px-4 sm:mx-0 sm:px-0 max-w-3xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              id={`plan-${plan.id}`}
              className={cn(
                "relative rounded-2xl border flex flex-col gap-6 transition-all duration-200 overflow-hidden",
                "snap-center shrink-0 w-[80vw] sm:w-auto",
                plan.highlighted
                  ? "bg-primary/10 border-primary/40 shadow-[0_0_50px_rgba(99,102,241,0.15)] p-7 sm:scale-[1.02]"
                  : "bg-surface border-border hover:border-primary/30 p-7",
              )}
            >
              {plan.badge && (
                <div className="absolute top-0 right-0">
                  <div
                    className={`${plan.badgeColor} text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl tracking-wide`}
                  >
                    {plan.badge}
                  </div>
                </div>
              )}

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
                      <span className="text-subtle text-sm">CAD / month</span>
                    )}
                  </div>
                  <p className="text-xs text-subtle mt-0.5">{plan.priceNote}</p>
                </div>
              </div>

              <div className="border-t border-border" />

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

              <Link
                id={`plan-cta-${plan.id}`}
                href={plan.ctaHref}
                className={cn(
                  "inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200",
                  plan.highlighted
                    ? "bg-primary text-white hover:bg-primary-hover"
                    : "bg-surface border border-border text-foreground hover:border-primary/40"
                )}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-subtle mt-3 sm:hidden">
          Swipe to compare plans
        </p>

        <div className="mt-10 rounded-2xl bg-surface border border-border p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 text-center divide-y divide-border sm:divide-y-0 sm:divide-x">
          {COMPARISON_NOTES.map(({ label, text }) => (
            <div key={label} className="space-y-1 pt-4 sm:pt-0 first:pt-0 sm:px-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">{label}</p>
              <p className="text-sm text-subtle leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-subtle mt-6">
          Prices in CAD. Monthly subscription — cancel any time. CELPIPBRO is not affiliated with Paragon Testing
          Enterprises. AI scores are practice estimates, not official CELPIP results.
        </p>
      </div>
    </section>
  );
}
