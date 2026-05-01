import Link from "next/link";
import { ArrowRight, Check, Rocket, Trophy, X, Zap } from "lucide-react";
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
  comingSoon?: boolean;
  badge?: string;
  badgeColor?: string;
}

const SPEAKING_TASK_COUNT = 8;
const WRITING_TASK_COUNT = 2;
const PRO_SPEAKING_PRACTICES =
  SPEAKING_TASK_COUNT * PRO_PLAN_LIMITS.speaking_attempts_per_task;
const PRO_WRITING_PRACTICES =
  WRITING_TASK_COUNT * PRO_PLAN_LIMITS.writing_attempts_per_task;
const ULTRA_SPEAKING_PRACTICES =
  SPEAKING_TASK_COUNT * ULTRA_PLAN_LIMITS.speaking_attempts_per_task;
const ULTRA_WRITING_PRACTICES =
  WRITING_TASK_COUNT * ULTRA_PLAN_LIMITS.writing_attempts_per_task;

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
      { text: "1 Speaking mock test",              included: true  },
      { text: "1 Writing mock test",               included: true  },
      { text: "Estimated band score",              included: true  },
      { text: "Vocabulary and connector tips",     included: true  },
      { text: "Detailed AI feedback",              included: false },
      { text: "Individual task practice",          included: false },
      { text: "Attempt history & progress",        included: false },
      { text: "Vocab templates & sample responses",included: false },
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
    badge: "Live Now",
    badgeColor: "bg-primary",
    cta: `Unlock ${PLAN_PRICING.pro.name}`,
    ctaHref: "/sign-up?plan=pro",
      features: [
      { text: `${PRO_SPEAKING_PRACTICES} Speaking practices across all 8 task types`, included: true, highlight: true },
      { text: `${PRO_WRITING_PRACTICES} Writing practices across both task types`,     included: true, highlight: true },
      { text: `${PRO_PLAN_LIMITS.speaking_mock_tests} full Speaking mock tests`,       included: true },
      { text: `${PRO_PLAN_LIMITS.writing_mock_tests} full Writing mock tests`,         included: true },
      { text: "Detailed AI feedback: strengths, weaknesses, and next steps",          included: true, highlight: true },
      { text: "Estimated band score per attempt",                                     included: true },
      { text: "Improved sample response",                                             included: true },
      { text: "Vocabulary, connectors & templates",                                   included: true },
      { text: "Attempt history & progress tracking",                                  included: true },
      { text: "Advanced analytics & deeper rewrite drills",                           included: false },
    ],
  },
  {
    id: PLAN_PRICING.ultra.id,
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
    cta: "Coming Soon",
    ctaHref: "#pricing",
    features: [
      { text: `${ULTRA_SPEAKING_PRACTICES} Speaking practices across all 8 task types`,  included: true, highlight: true },
      { text: `${ULTRA_WRITING_PRACTICES} Writing practices across both task types`,      included: true, highlight: true },
      { text: `${ULTRA_PLAN_LIMITS.speaking_mock_tests} full Speaking mock tests`,        included: true },
      { text: `${ULTRA_PLAN_LIMITS.writing_mock_tests} full Writing mock tests`,          included: true },
      { text: "Advanced AI feedback with rewriting tools",                              included: true, highlight: true },
      { text: "Multiple sample responses per attempt",                                  included: true },
      { text: "Advanced analytics & weak-area detection",                               included: true },
      { text: "Personalized study suggestions",                                         included: true },
      { text: "Idea generation & vocabulary drills",                                    included: true },
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
      label: "Why One-Time?",
      text: `Pro includes ${PRO_SPEAKING_PRACTICES} Speaking and ${PRO_WRITING_PRACTICES} Writing practice sessions, plus ${PRO_PLAN_LIMITS.speaking_mock_tests + PRO_PLAN_LIMITS.writing_mock_tests} full mock tests — for a single payment, no subscription.`,
    },
    {
      label: "Ultra",
      text: "Ultra is coming soon with expanded practice volume, advanced rewriting tools, and analytics. Join the waitlist to be notified.",
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


        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:overflow-visible sm:pb-0 sm:grid sm:grid-cols-3 sm:gap-6 items-start -mx-4 px-4 sm:mx-0 sm:px-0">
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
                plan.comingSoon && "opacity-90"
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
                      <span className="text-subtle text-sm">CAD</span>
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

              {plan.comingSoon ? (
                <div
                  id={`plan-cta-${plan.id}`}
                  className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-warning/5 border border-warning/30 text-warning/70 font-semibold text-sm cursor-not-allowed select-none"
                  aria-disabled="true"
                >
                  {plan.cta}
                </div>
              ) : (
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
              )}
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
          Prices in CAD. Paid plans are one-time purchases with no subscription
          or renewal. CELPIPBRO is not affiliated with Paragon Testing
          Enterprises. AI scores are practice estimates, not official CELPIP
          results.
        </p>
      </div>
    </section>
  );
}
