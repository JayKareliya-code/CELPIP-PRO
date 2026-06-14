import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardList,
  LayoutGrid,
  Mic,
  Package,
  PenLine,
  Rocket,
  SlidersHorizontal,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PLAN_PRICING,
  PRO_PLAN_LIMITS,
  STARTER_PLAN_LIMITS,
} from "@/lib/constants";

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
const WRITING_TASK_COUNT = 2;

const STARTER_SPEAKING =
  SPEAKING_TASK_COUNT * STARTER_PLAN_LIMITS.speaking_attempts_per_task;
const STARTER_WRITING =
  WRITING_TASK_COUNT * STARTER_PLAN_LIMITS.writing_attempts_per_task;
const PRO_SPEAKING =
  SPEAKING_TASK_COUNT * PRO_PLAN_LIMITS.speaking_attempts_per_task;
const PRO_WRITING =
  WRITING_TASK_COUNT * PRO_PLAN_LIMITS.writing_attempts_per_task;

// Mirrors the billing page (components/billing/PlanGrid.tsx + PlanCard.tsx) —
// the single source of truth for plan contents and visual design.
const PLANS: Plan[] = [
  {
    id: PLAN_PRICING.starter.id,
    name: PLAN_PRICING.starter.name,
    tagline: "Try the full workflow free",
    priceLabel: PLAN_PRICING.starter.priceLabel,
    priceNote: PLAN_PRICING.starter.priceNote,
    icon: <Zap className="w-5 h-5 text-primary" />,
    iconBg: "border-white/[0.10] bg-transparent",
    highlighted: false,
    cta: "Start Free",
    ctaHref: "/sign-up",
    features: [
      { text: `${STARTER_SPEAKING} Speaking practices`, included: true, highlight: true },
      { text: `${STARTER_WRITING} Writing practices`, included: true, highlight: true },
      { text: "1 full mock test", included: true, highlight: true },
      { text: "Basic estimated band score", included: true, highlight: true },
      { text: "Retry credits", included: false, highlight: true },
      { text: "Detailed rubric-style scoring", included: false, highlight: true },
      { text: "Targeted rewrite response", included: false, highlight: true },
      { text: "Progress tracking", included: false, highlight: true },
      { text: "Analytics", included: false, highlight: true },
    ],
  },
  {
    id: PLAN_PRICING.pro.id,
    name: PLAN_PRICING.pro.name,
    tagline: "Everything to reach your target band",
    priceLabel: PLAN_PRICING.pro.priceLabel,
    priceNote: PLAN_PRICING.pro.priceNote,
    icon: <Rocket className="w-5 h-5 text-primary" />,
    iconBg: "border-white/[0.10] bg-transparent",
    highlighted: true,
    badge: "Most Popular",
    cta: `Unlock ${PLAN_PRICING.pro.name}`,
    ctaHref: "/sign-up?plan=pro",
    features: [
      { text: `${PRO_SPEAKING} Speaking practices`, included: true, highlight: true },
      { text: `${PRO_WRITING} Writing practices`, included: true, highlight: true },
      { text: "2 full mock tests", included: true, highlight: true },
      { text: "Advanced AI feedback", included: true, highlight: true },
      { text: "70 retry credits", included: true, highlight: true },
      { text: "Detailed rubric-style scoring", included: true, highlight: true },
      { text: "Targeted rewrite response", included: true, highlight: true },
      { text: "Progress tracking", included: true, highlight: true },
      { text: "Analytics", included: true, highlight: true },
    ],
  },
];

// Practice add-ons — mirrors components/billing/AddonGrid.tsx + AddonRow.tsx.
// Keep prices/benefits in sync with the billing page.
const ADDONS = [
  {
    icon: <PenLine className="w-4 h-4 text-blue-400" />,
    iconBg: "border-white/[0.10] bg-transparent",
    name: "Writing Pack",
    price: "$2.99",
    points: ["Adds 5 questions per task", "10 writing questions total", "Adds 10 retry credits"],
  },
  {
    icon: <Mic className="w-4 h-4 text-emerald-400" />,
    iconBg: "border-white/[0.10] bg-transparent",
    name: "Speaking Pack",
    price: "$6.99",
    points: ["Adds 5 questions per task", "40 speaking questions total", "Adds 40 retry credits"],
  },
  {
    icon: <ClipboardList className="w-4 h-4 text-violet-400" />,
    iconBg: "border-white/[0.10] bg-transparent",
    name: "Mock Test Bundle",
    price: "$2.99",
    points: ["1 full Speaking test", "1 full Writing test", "Adds 10 retry credits"],
  },
  {
    icon: <SlidersHorizontal className="w-4 h-4 text-primary" />,
    iconBg: "border-white/[0.10] bg-transparent",
    name: "Custom Task Bundle",
    price: "$1.99",
    points: ["5 questions for any task", "Adds 5 retry credits"],
  },
];

export function PricingPreview() {
  return (
    <section id="pricing" className="relative overflow-hidden py-20 sm:py-32 bg-[#080808]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[360px] w-[680px] -translate-x-1/2 rounded-full bg-primary/[0.05] blur-[150px]" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white/90">
            Start Free. Unlock Everything With a Single Payment.
          </h2>
          <p className="mt-4 text-white/55 text-base leading-relaxed">
            No subscription. Pay once for Pro and it&apos;s yours — then top up
            with practice packs whenever you want more reps.
          </p>
        </div>

        {/* Store grid — identical structure to the billing page */}
        <div className="space-y-3">
          {/* Section labels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="sm:col-span-2 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-white/70 uppercase tracking-widest leading-none">
                  Feature Plans
                </p>
                <p className="text-[11px] text-white/55 mt-0.5">
                  Start free or unlock everything once
                </p>
              </div>
            </div>
            <div className="sm:col-span-2 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <LayoutGrid className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-white/70 uppercase tracking-widest leading-none">
                  Add-Ons
                </p>
                <p className="text-[11px] text-white/55 mt-0.5">
                  One-time packs — top up any time
                </p>
              </div>
            </div>
          </div>

          {/* 4-column card row: Starter | Pro | 2×2 add-on grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            {/* Plan cards */}
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                id={`plan-${plan.id}`}
                className={cn(
                  "relative rounded-xl border flex flex-col gap-5 transition-all duration-200 overflow-hidden p-6 h-full bg-surface",
                  "border-white/[0.14] hover:border-white/[0.22]",
                  plan.highlighted && "shadow-[0_0_30px_rgba(245,158,11,0.07)]",
                )}
              >
                {/* Corner badge */}
                {plan.badge && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-primary/20 text-primary text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl tracking-widest uppercase border-l border-b border-primary/20">
                      {plan.badge}
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="space-y-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", plan.iconBg)}>
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white/90">{plan.name}</h3>
                    <p className="text-sm text-white/50 mt-0.5">{plan.tagline}</p>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold text-white/90">{plan.priceLabel}</span>
                      {plan.priceLabel !== "Free" && (
                        <span className="text-xs text-white/50">CAD</span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-1">{plan.priceNote}</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/[0.10]" />

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
                          : "text-white/35",
                      )}
                    >
                      {feat.included ? (
                        <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
                      ) : (
                        <X className="w-4 h-4 flex-shrink-0 mt-0.5 text-white/30" />
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
                      ? "bg-primary hover:bg-primary-hover text-primary-foreground btn-glow"
                      : "border border-white/[0.14] text-white/60 hover:border-white/[0.28] hover:text-white/85",
                  )}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}

            {/* Add-ons — 2×2 grid spanning the right 2 columns (same as billing) */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch sm:auto-rows-fr">
              {ADDONS.map((addon) => (
                <div
                  key={addon.name}
                  className="relative rounded-xl border border-white/[0.14] hover:border-white/[0.22] transition-all duration-200 h-full bg-surface flex flex-col"
                >
                  {/* Header: icon + name + price */}
                  <div className="px-5 pt-5 pb-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border shrink-0", addon.iconBg)}>
                        {addon.icon}
                      </div>
                      <h3 className="text-sm font-semibold text-white/80 leading-snug tracking-tight">
                        {addon.name}
                      </h3>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold text-white tabular-nums leading-none">
                          {addon.price}
                        </span>
                        <span className="text-[11px] font-medium text-white/55 tracking-wide">CAD</span>
                      </div>
                      <p className="text-[11px] text-white/55 mt-1">One-time purchase</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-white/[0.08]" />

                  {/* Benefits — one per line */}
                  <div className="px-5 py-3.5 flex flex-col gap-1.5">
                    {addon.points.map((pt) => (
                      <div key={pt} className="flex items-center gap-2.5">
                        <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
                        <span className="text-sm text-white/85 font-medium">{pt}</span>
                      </div>
                    ))}
                  </div>

                  {/* Spacer — keeps content top-aligned so the card fills its
                      cell cleanly (mirrors the billing add-on card shell). */}
                  <div className="flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-white/55 mt-8 max-w-lg mx-auto leading-relaxed">
          Prices in CAD. Pro is a one-time payment — no subscription.
          CELPIPBRO is not affiliated with Paragon Testing Enterprises.
          AI scores are practice estimates, not official CELPIP results.
        </p>
      </div>
    </section>
  );
}
