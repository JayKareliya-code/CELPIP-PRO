import { PlayCircle, TrendingUp, UserCheck } from "lucide-react";

interface Step {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    icon: <UserCheck className="w-6 h-6 text-primary" />,
    title: "Create Your Free Account",
    description:
      "Sign up and set your target band score for a more personalized practice experience — sample responses and feedback are shaped around the score you are aiming for.",
  },
  {
    number: "02",
    icon: <PlayCircle className="w-6 h-6 text-success" />,
    title: "Practice Under Timed Conditions",
    description:
      "Try a full mock test or choose an individual Speaking or Writing task type to practise with prep timers and response windows — just like the real exam.",
  },
  {
    number: "03",
    icon: <TrendingUp className="w-6 h-6 text-warning" />,
    title: "Review Feedback and Track Your Progress",
    description:
      "Use estimated band scores, strengths, weaknesses, sample responses, and attempt history to decide what to improve next.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 sm:py-28 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            Simple Process
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Practice, Get Feedback, Improve the Next Attempt
          </h2>
          <p className="mt-4 text-subtle text-lg leading-relaxed">
            Practice on your own schedule, get instant AI feedback on every
            attempt, and always know exactly where you stand and what to work
            on next.
          </p>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-0">
          <div
            aria-hidden="true"
            className="hidden lg:block absolute top-10 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-transparent via-border to-transparent"
          />

          {STEPS.map((step, idx) => (
            <div
              key={step.number}
              className="relative flex flex-col items-center text-center px-6"
            >
              <div className="relative z-10 w-20 h-20 rounded-full bg-surface border border-border flex flex-col items-center justify-center shadow-panel mb-6">
                <div className="mb-1">{step.icon}</div>
                <span className="text-[10px] font-bold text-subtle tracking-widest">
                  STEP {step.number}
                </span>
              </div>

              {idx < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className="hidden lg:block absolute top-10 -translate-y-1/2 right-0 translate-x-1/2 w-2.5 h-2.5 rounded-full bg-border z-20"
                />
              )}

              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-subtle leading-relaxed max-w-xs">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
