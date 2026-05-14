import {
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  ClipboardCheck,
  Clock,
  Lightbulb,
  Mic,
  PenLine,
} from "lucide-react";

interface Feature {
  icon: React.ReactNode;
  title: string;
  bullets: string[];
  iconBg: string;
  tag?: string;
  tagColor?: string;
}

const FEATURES: Feature[] = [
  {
    icon: <Mic className="w-5 h-5 text-amber-400" />,
    iconBg: "bg-amber-500/15 border-amber-500/25",
    title: "8 Speaking Task Types",
    bullets: [
      "All 8 official task types covered",
      "Exam-style prep timers & timed recording",
      "AI feedback after every attempt",
    ],
    tag: "All Plans",
    tagColor: "text-amber-400 bg-amber-400/10 border border-amber-400/20",
  },
  {
    icon: <PenLine className="w-5 h-5 text-emerald-400" />,
    iconBg: "bg-emerald-500/15 border-emerald-500/25",
    title: "2 Writing Task Types",
    bullets: [
      "Email & opinion response tasks",
      "Timed editor with live word counter",
      "Structured guidance & sample responses",
    ],
    tag: "All Plans",
    tagColor: "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20",
  },
  {
    icon: <ClipboardCheck className="w-5 h-5 text-indigo-400" />,
    iconBg: "bg-indigo-400/15 border-indigo-400/25",
    title: "Full Speaking & Writing Mocks",
    bullets: [
      "Full exam simulation in one session",
      "Same structure & format as the real test",
      "Estimated band score on completion",
    ],
    tag: "Starter+",
    tagColor: "text-indigo-400 bg-indigo-400/10 border border-indigo-400/20",
  },
  {
    icon: <BrainCircuit className="w-5 h-5 text-cyan-400" />,
    iconBg: "bg-cyan-400/15 border-cyan-400/25",
    title: "AI Feedback by Dimension",
    bullets: [
      "Scores across Content, Vocabulary & more",
      "Strengths and areas to improve",
      "Actionable next steps per attempt",
    ],
    tag: "Pro",
    tagColor: "text-cyan-400 bg-cyan-400/10 border border-cyan-400/20",
  },
  {
    icon: <BookOpenCheck className="w-5 h-5 text-yellow-400" />,
    iconBg: "bg-yellow-400/15 border-yellow-400/25",
    title: "Vocab, Connectors & Templates",
    bullets: [
      "Curated vocabulary for Speaking & Writing",
      "Discourse connectors to link ideas",
      "Response templates for faster answers",
    ],
    tag: "Pro",
    tagColor: "text-yellow-400 bg-yellow-400/10 border border-yellow-400/20",
  },
  {
    icon: <Clock className="w-5 h-5 text-rose-400" />,
    iconBg: "bg-rose-400/15 border-rose-400/25",
    title: "Exam-Style Timing",
    bullets: [
      "Prep timers before every response",
      "Response countdowns matching real exam",
      "Timed writing with auto-submit",
    ],
    tag: "All Plans",
    tagColor: "text-rose-400 bg-rose-400/10 border border-rose-400/20",
  },
  {
    icon: <BarChart3 className="w-5 h-5 text-purple-400" />,
    iconBg: "bg-purple-400/15 border-purple-400/25",
    title: "Advanced Analytics",
    bullets: [
      "Weak-area detection across attempts",
      "Progress trends by task type",
      "Deep performance insights",
    ],
    tag: "Coming Soon",
    tagColor: "text-white/30 bg-white/[0.05] border border-white/[0.10]",
  },
  {
    icon: <Lightbulb className="w-5 h-5 text-teal-400" />,
    iconBg: "bg-teal-400/15 border-teal-400/25",
    title: "Deeper Rewrite Drills",
    bullets: [
      "Intensive rewrite guidance per attempt",
      "Idea-generation drills for richer answers",
      "For learners pushing beyond standard practice",
    ],
    tag: "Coming Soon",
    tagColor: "text-white/30 bg-white/[0.05] border border-white/[0.10]",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="py-20 sm:py-32 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">
            What You Get
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white/90">
            Built Around the CELPIP Speaking and Writing Format
          </h2>
          <p className="mt-4 text-white/45 text-lg leading-relaxed">
            Practice every task type you will face on exam day, work under
            real-time pressure, and use feedback to close the gap.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-xl border border-white/[0.10] bg-white/[0.03] hover:border-white/[0.22] hover:bg-white/[0.05] transition-all duration-200 p-5 flex flex-col gap-4"
            >
              {/* Icon + tag row */}
              <div className="flex items-start justify-between gap-2">
                <div
                  className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${feature.iconBg}`}
                >
                  {feature.icon}
                </div>
                {feature.tag && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${feature.tagColor}`}>
                    {feature.tag}
                  </span>
                )}
              </div>

              {/* Text */}
              <div>
                <h3 className="font-semibold text-white/85 text-sm">{feature.title}</h3>
                <ul className="mt-2 space-y-1.5">
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-xs text-white/40 leading-relaxed">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-white/25 flex-shrink-0" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
