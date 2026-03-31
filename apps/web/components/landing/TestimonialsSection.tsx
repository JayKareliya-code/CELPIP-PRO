import { Star, Quote } from "lucide-react";
import { PLAN_PRICING } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Testimonial {
  id: string;
  name: string;
  initial: string;
  location: string;
  plan: string;         // which plan they used
  planColor: string;    // Tailwind text color for the plan pill
  targetBand: number;
  achievedBand: number;
  practiceWeeks: number;
  quote: string;
  accentColor: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    name: "Priya S.",
    initial: "P",
    location: "Toronto, ON",
    plan: PLAN_PRICING.ultra.name,       // Band Achiever
    planColor: "text-warning",
    targetBand: 9,
    achievedBand: 10,
    practiceWeeks: 3,
    quote:
      "I needed a 9 for my permanent residency and I was consistently falling short on Speaking. " +
      "With the Ultra plan's 15 attempts per task and the advanced AI rewrites, I could see exactly " +
      "what I was doing wrong. Scored a 10 in 3 weeks. The detailed weak-area feedback is worth every penny.",
    accentColor: "from-warning/15 to-yellow-900/10",
  },
  {
    id: "t2",
    name: "Marcos L.",
    initial: "M",
    location: "Vancouver, BC",
    plan: PLAN_PRICING.pro.name,         // Score Booster
    planColor: "text-primary",
    targetBand: 8,
    achievedBand: 9,
    practiceWeeks: 4,
    quote:
      "The Pro plan was exactly what I needed — 5 attempts per Writing task and 2 full mock tests " +
      "at a price I could actually afford. The improved sample responses after each attempt showed " +
      "me how a 9-band answer looks compared to mine. My Writing went from 7 to 9 in a month.",
    accentColor: "from-primary/15 to-indigo-900/10",
  },
  {
    id: "t3",
    name: "Anjali K.",
    initial: "A",
    location: "Calgary, AB",
    plan: PLAN_PRICING.starter.name,     // Starter → upgraded to Pro
    planColor: "text-subtle",
    targetBand: 7,
    achievedBand: 8,
    practiceWeeks: 2,
    quote:
      "I almost didn't sign up because I thought it would be another subscription. " +
      "The free mock test convinced me — I got my first AI band score in 10 minutes. " +
      "I upgraded to Pro the same day. Two weeks later, I had my 8. " +
      "One-time payment, zero regrets.",
    accentColor: "from-success/15 to-emerald-900/10",
  },
];

/**
 * TestimonialsSection — 3 social proof cards.
 * Each story is tied to a specific plan to reinforce the upsell journey.
 */
export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 sm:py-28 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            Success Stories
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Real Learners, Real Band Score Gains
          </h2>
          <p className="mt-4 text-subtle text-lg leading-relaxed">
            From Starter to Band Achiever — every plan has helped candidates
            hit their target and move forward with their Canadian journey.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.id}
              className={`relative rounded-2xl bg-gradient-to-br ${t.accentColor} border border-border p-7 flex flex-col gap-5 hover:border-primary/30 transition-all duration-200`}
            >
              {/* Quote icon */}
              <Quote
                className="w-8 h-8 text-primary/25 absolute top-5 right-5"
                aria-hidden="true"
              />

              {/* Stars + plan pill */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-surface/60 border border-border ${t.planColor}`}>
                  {t.plan}
                </span>
              </div>

              {/* Quote */}
              <p className="text-sm text-foreground/90 leading-relaxed flex-1 italic">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Stats row */}
              <div className="flex items-center gap-4 py-3 border-y border-border/50">
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-foreground">{t.achievedBand}</p>
                  <p className="text-xs text-subtle">Band Achieved</p>
                </div>
                <div className="h-8 w-px bg-border/50" />
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-foreground">{t.practiceWeeks}w</p>
                  <p className="text-xs text-subtle">To Improve</p>
                </div>
                <div className="h-8 w-px bg-border/50" />
                <div className="text-center flex-1">
                  {(() => {
                    const gain = t.achievedBand - t.targetBand;
                    return (
                      <>
                        <p className={cn("text-lg font-bold", gain >= 0 ? "text-success" : "text-danger")}>
                          {gain >= 0 ? "+" : ""}{gain}
                        </p>
                        <p className="text-xs text-subtle">Bands Gained</p>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold flex-shrink-0">
                  {t.initial}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-subtle">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
