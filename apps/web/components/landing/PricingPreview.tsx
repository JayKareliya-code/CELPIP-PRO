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
    icon: <Zap className="w-5 h-5 text-white/40" />,
    iconBg: "bg-white/[0.06] border border-white/[0.12]",
    highlighted: false,
    cta: "Start Free",
    ctaHref: "/sign-up",
    features: [
      { text: "Band estimation only",       included: true  },
      { text: "1 speaking mock test",        included: true  },
      { text: "1 writing mock test",         included: true  },
      { text: "Basic results view",          included: true  },
      { text: "Detailed AI feedback",        included: false },
      { text: "Strengths & weaknesses",      included: false },
      { text: "Improvement tips",            included: false },
      { text: "Sample response",             included: false },
    ],
  },
  {
    id: PLAN_PRICING.pro.id,
    name: PLAN_PRICING.pro.name,
    tagline: "Everything to reach your target band",
    priceLabel: PLAN_PRICING.pro.priceLabel,
    priceNote: PLAN_PRICING.pro.priceNote,
    icon: <Rocket className="w-5 h-5 text-amber-400" />,
    iconBg: "bg-amber-500/15 border border-amber-500/30",
    highlighted: true,
    badge: "Most Popular",
    cta: `Unlock ${PLAN_PRICING.pro.name}`,
    ctaHref: "/sign-up?plan=pro",
    features: [
      { text: `${PRO_SPEAKING_PRACTICES} Speaking practices across all 8 tasks`, included: true, highlight: true },
      { text: `${PRO_WRITING_PRACTICES} Writing practices across both tasks`,     included: true, highlight: true },
      { text: "Detailed AI feedback report",                                       included: true, highlight: true },
      { text: "Strengths & weaknesses",                                            included: true },
      { text: "Improvement tips per attempt",                                      included: true },
      { text: "Sample response included",                                          included: true },
      { text: "Progress tracking",                                                 included: true },
    ],
  },
];

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
    text: "Pro subscribers can buy Writing, Speaking, or Mock Test Bundle add-ons to get more focused practice exactly where they need it.",
  },
];

export function PricingPreview() {
  return (
    <section id="pricing" className="py-20 sm:py-32 bg-[#080808]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">
            Transparent Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white/90">
            Start Free. Unlock Full Practice When You&apos;re Ready.
          </h2>
          <p className="mt-4 text-white/45 text-base leading-relaxed">
            No hidden fees. One-time or monthly — the choice is yours.
          </p>
        </div>

        {/* Plan cards */}
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:overflow-visible sm:pb-0 sm:grid sm:grid-cols-2 sm:gap-5 items-start -mx-4 px-4 sm:mx-0 sm:px-0 max-w-3xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              id={`plan-${plan.id}`}
              className={cn(
                "relative rounded-xl border flex flex-col gap-5 transition-all duration-200 overflow-hidden p-6",
                "snap-center shrink-0 w-[80vw] sm:w-auto h-full",
                plan.highlighted
                  ? "border-amber-500/30 bg-white/[0.04] shadow-[0_0_40px_rgba(245,158,11,0.10)]"
                  : "border-white/[0.10] bg-white/[0.03] hover:border-white/[0.20]",
              )}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-0 right-0">
                  <div className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl tracking-widest uppercase border-l border-b border-amber-500/25">
                    {plan.badge}
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="space-y-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", plan.iconBg)}>
                  {plan.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white/90">{plan.name}</h3>
                  <p className="text-sm text-white/45 mt-0.5">{plan.tagline}</p>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold text-white/90">
                      {plan.priceLabel}
                    </span>
                    {plan.priceLabel !== "Free" && (
                      <span className="text-xs text-white/45">CAD</span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">{plan.priceNote}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/[0.08]" />

              {/* Features */}
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
                        : "text-white/25",
                    )}
                  >
                    {feat.included ? (
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                    ) : (
                      <X className="w-4 h-4 flex-shrink-0 mt-0.5 text-white/20" />
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
                  "inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg font-semibold text-sm transition-all duration-200",
                  plan.highlighted
                    ? "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_30px_rgba(245,158,11,0.55)]"
                    : "border border-white/[0.14] text-white/60 hover:border-white/[0.28] hover:text-white/85",
                )}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-white/25 mt-2 sm:hidden">
          Swipe to compare plans
        </p>

        {/* Comparison notes */}
        <div className="mt-8 rounded-xl border border-white/[0.10] bg-white/[0.03] p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 divide-y divide-white/[0.06] sm:divide-y-0 sm:divide-x max-w-3xl mx-auto">
          {COMPARISON_NOTES.map(({ label, text }) => (
            <div key={label} className="space-y-1 pt-5 sm:pt-0 first:pt-0 sm:px-5">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{label}</p>
              <p className="text-sm text-white/45 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-white/25 mt-5 max-w-lg mx-auto leading-relaxed">
          Prices in CAD. Monthly subscription — cancel any time.
          CELPIPBRO is not affiliated with Paragon Testing Enterprises.
          AI scores are practice estimates, not official CELPIP results.
        </p>
      </div>
    </section>
  );
}
