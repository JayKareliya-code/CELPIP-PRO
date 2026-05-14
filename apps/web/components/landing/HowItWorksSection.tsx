import { PlayCircle, TrendingUp, UserCheck } from "lucide-react";

interface Step {
  number: string;
  icon: React.ReactNode;
  iconBg: string;
  connectorColor: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    icon: <UserCheck className="w-6 h-6 text-amber-400" />,
    iconBg: "bg-amber-400/15 border-amber-400/30",
    connectorColor: "from-amber-500/40 to-emerald-500/40",
    title: "Create Your Free Account",
    description:
      "Sign up in seconds, set your target band score, and immediately get access to a free full-length mock test for both Speaking and Writing.",
  },
  {
    number: "02",
    icon: <PlayCircle className="w-6 h-6 text-emerald-400" />,
    iconBg: "bg-emerald-400/15 border-emerald-400/30",
    connectorColor: "from-emerald-500/40 to-indigo-500/40",
    title: "Practice Under Real Exam Conditions",
    description:
      "Run a full mock test or jump into individual Speaking and Writing task types — all with official-style prep timers, response windows, and auto-submit.",
  },
  {
    number: "03",
    icon: <TrendingUp className="w-6 h-6 text-indigo-400" />,
    iconBg: "bg-indigo-400/15 border-indigo-400/30",
    connectorColor: "",
    title: "Review AI Feedback and Improve",
    description:
      "Get an estimated band score, dimension-level feedback, strengths and weaknesses, and an improved sample response — then track your progress over time.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 sm:py-32 bg-[#080808]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">
            Simple Process
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white/90">
            Practice, Get Feedback, Improve the Next Attempt
          </h2>
          <p className="mt-4 text-white/45 text-lg leading-relaxed">
            Practice on your own schedule. Instant AI feedback on every attempt.
            Always know what to work on next.
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Desktop connector line */}
          <div
            aria-hidden
            className="hidden lg:block absolute top-9 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px bg-gradient-to-r from-amber-500/30 via-emerald-500/30 to-indigo-500/30"
          />

          {STEPS.map((step, idx) => (
            <div
              key={step.number}
              className="relative flex flex-col items-center text-center"
            >
              {/* Step circle */}
              <div
                className={`relative z-10 w-[4.5rem] h-[4.5rem] rounded-full border flex flex-col items-center justify-center mb-6 ${step.iconBg}`}
              >
                {step.icon}
                <span className="text-[9px] font-bold text-white/30 tracking-widest mt-0.5">
                  {step.number}
                </span>
              </div>

              {/* Connector dot on desktop */}
              {idx < STEPS.length - 1 && (
                <div
                  aria-hidden
                  className="hidden lg:block absolute top-9 -translate-y-1/2 right-0 translate-x-1/2 w-2 h-2 rounded-full bg-white/20 z-20"
                />
              )}

              {/* Card */}
              <div className="rounded-xl border border-white/[0.10] bg-white/[0.03] p-5 w-full text-left">
                <h3 className="text-base font-semibold text-white/85">{step.title}</h3>
                <p className="mt-2 text-sm text-white/45 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
