import { UserCheck, PlayCircle, TrendingUp } from "lucide-react";

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
      "Sign up in seconds with email or Google. Set your target band score and the date of your exam so we can tailor your practice schedule.",
  },
  {
    number: "02",
    icon: <PlayCircle className="w-6 h-6 text-success" />,
    title: "Practice With Realistic Tasks",
    description:
      "Choose any Speaking or Writing task. The timed practice session mirrors the real exam — countdown overlay, prep timer, then a response window.",
  },
  {
    number: "03",
    icon: <TrendingUp className="w-6 h-6 text-warning" />,
    title: "Get Feedback & Track Progress",
    description:
      "AI scoring delivers rubric-based band estimates within seconds. Review detailed feedback per dimension and watch your scores climb over time.",
  },
];

/**
 * HowItWorksSection — Horizontal numbered steps with connector lines on desktop.
 */
export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            Simple Process
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            From Sign-Up to Band Score in 3 Steps
          </h2>
          <p className="mt-4 text-subtle text-lg leading-relaxed">
            No complicated setup. Start your first practice session in under
            two minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-0">

          {/* Connector line (desktop only) */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute top-10 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-transparent via-border to-transparent"
          />

          {STEPS.map((step, idx) => (
            <div
              key={step.number}
              className="relative flex flex-col items-center text-center px-6"
            >
              {/* Step number bubble */}
              <div className="relative z-10 w-20 h-20 rounded-full bg-surface border border-border flex flex-col items-center justify-center shadow-panel mb-6">
                <div className="mb-1">{step.icon}</div>
                <span className="text-[10px] font-bold text-subtle tracking-widest">
                  STEP {step.number}
                </span>
              </div>

              {/* Connector dot between steps (desktop) */}
              {idx < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className="hidden lg:block absolute top-10 right-0 w-2.5 h-2.5 rounded-full bg-border z-10"
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
