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
  accent: string;
  tag?: string;
  tagColor?: string;
}

const FEATURES: Feature[] = [
  {
    icon: <Mic className="w-5 h-5 text-primary" />,
    title: "8 Speaking Task Types",
    bullets: [
      "All 8 official task types covered",
      "Exam-style prep timers & timed recording",
      "AI feedback after every attempt",
    ],
    accent: "bg-primary/15",
    tag: "All Plans",
    tagColor: "text-primary bg-primary/10",
  },
  {
    icon: <PenLine className="w-5 h-5 text-success" />,
    title: "2 Writing Task Types",
    bullets: [
      "Email & opinion response tasks",
      "Timed editor with live word counter",
      "Structured guidance & sample responses",
    ],
    accent: "bg-success/15",
    tag: "All Plans",
    tagColor: "text-success bg-success/10",
  },
  {
    icon: <ClipboardCheck className="w-5 h-5 text-indigo-400" />,
    title: "Full Speaking & Writing Mocks",
    bullets: [
      "Full exam simulation in one session",
      "Same structure & format as the real test",
      "Estimated band score on completion",
    ],
    accent: "bg-indigo-400/15",
    tag: "Paid Plans",
    tagColor: "text-indigo-400 bg-indigo-400/10",
  },
  {
    icon: <BrainCircuit className="w-5 h-5 text-cyan-400" />,
    title: "AI Feedback by Dimension",
    bullets: [
      "Scores across Content, Vocabulary & more",
      "Strengths and areas to improve",
      "Actionable next steps per attempt",
    ],
    accent: "bg-cyan-400/15",
    tag: "Paid Plans",
    tagColor: "text-cyan-400 bg-cyan-400/10",
  },
  {
    icon: <BookOpenCheck className="w-5 h-5 text-warning" />,
    title: "Vocab, Connectors & Templates",
    bullets: [
      "Curated vocabulary for Speaking & Writing",
      "Discourse connectors to link ideas",
      "Response templates for faster answers",
    ],
    accent: "bg-warning/15",
    tag: "Paid Plans",
    tagColor: "text-warning bg-warning/10",
  },
  {
    icon: <Clock className="w-5 h-5 text-rose-400" />,
    title: "Exam-Style Timing",
    bullets: [
      "Prep timers before every response",
      "Response countdowns matching real exam",
      "Timed writing sessions with auto-submit",
    ],
    accent: "bg-rose-400/15",
    tag: "All Plans",
    tagColor: "text-rose-400 bg-rose-400/10",
  },
  {
    icon: <BarChart3 className="w-5 h-5 text-purple-400" />,
    title: "Advanced Analytics",
    bullets: [
      "Weak-area detection across attempts",
      "Progress trends by task type",
      "Deep performance insights",
    ],
    accent: "bg-purple-400/15",
    tag: "Coming Soon",
    tagColor: "text-purple-400 bg-purple-400/10",
  },
  {
    icon: <Lightbulb className="w-5 h-5 text-emerald-400" />,
    title: "Deeper Rewrite Drills",
    bullets: [
      "Intensive rewrite guidance per attempt",
      "Idea-generation drills for richer answers",
      "For learners pushing beyond standard practice",
    ],
    accent: "bg-emerald-400/15",
    tag: "Coming Soon",
    tagColor: "text-emerald-400 bg-emerald-400/10",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="py-16 sm:py-28 bg-surface/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            What You Get
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Built Around the CELPIP Speaking and Writing Format
          </h2>
          <p className="mt-4 text-subtle text-lg leading-relaxed">
            Practice every task type you will face on exam day, work under
            real-time pressure, and use feedback to close the gap.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group celpip-card card-interactive flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={`w-11 h-11 rounded-xl ${feature.accent} flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}
                >
                  {feature.icon}
                </div>
                {feature.tag && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${feature.tagColor}`}>
                    {feature.tag}
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                <ul className="mt-2 space-y-1">
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-1.5 text-xs text-subtle leading-relaxed">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-subtle/50 flex-shrink-0" />
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

