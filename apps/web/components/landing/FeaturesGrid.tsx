import {
  Mic,
  PenLine,
  BrainCircuit,
  Clock,
  BookOpenCheck,
  BarChart3,
  ClipboardCheck,
  Lightbulb,
} from "lucide-react";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  tag?: string; // plan label shown as a small pill
  tagColor?: string;
}

const FEATURES: Feature[] = [
  {
    icon: <Mic className="w-5 h-5 text-primary" />,
    title: "8 Speaking Task Types",
    description:
      "Practice every CELPIP Speaking task — Giving Advice, Describing Scenes, Expressing Opinions, and more — with realistic exam-style prompts and prep timers.",
    accent: "bg-primary/15",
    tag: "All Plans",
    tagColor: "text-primary bg-primary/10",
  },
  {
    icon: <PenLine className="w-5 h-5 text-success" />,
    title: "Email & Essay Writing",
    description:
      "Master both Writing tasks in a distraction-free editor with a live word counter, timed session, and idea-hints accordion to spark your response.",
    accent: "bg-success/15",
    tag: "All Plans",
    tagColor: "text-success bg-success/10",
  },
  {
    icon: <ClipboardCheck className="w-5 h-5 text-indigo-400" />,
    title: "Full Speaking & Writing Mocks",
    description:
      "Simulate the complete CELPIP exam experience. Score Booster includes 2 full mocks; Band Achiever unlocks 5 — with the same format and timing as the real test.",
    accent: "bg-indigo-400/15",
    tag: "Pro & Ultra",
    tagColor: "text-indigo-400 bg-indigo-400/10",
  },
  {
    icon: <BrainCircuit className="w-5 h-5 text-cyan-400" />,
    title: "AI Rubric-Based Feedback",
    description:
      "Get scored on Task Fulfillment, Vocabulary Range, Coherence, and Grammar — exactly like a CELPIP rater. Ultra users receive advanced rewrites and multiple sample responses.",
    accent: "bg-cyan-400/15",
    tag: "Pro & Ultra",
    tagColor: "text-cyan-400 bg-cyan-400/10",
  },
  {
    icon: <BookOpenCheck className="w-5 h-5 text-warning" />,
    title: "Vocab, Connectors & Templates",
    description:
      "Every task comes with curated vocabulary chips, discourse connectors, and structural intro/conclusion templates so your responses always sound natural and organized.",
    accent: "bg-warning/15",
    tag: "Pro & Ultra",
    tagColor: "text-warning bg-warning/10",
  },
  {
    icon: <Clock className="w-5 h-5 text-rose-400" />,
    title: "Exam-Accurate Timing",
    description:
      "Prep-timer rings, response countdown bars, and auto-submit train you to think and write on demand — so exam-day time pressure feels familiar, not frightening.",
    accent: "bg-rose-400/15",
    tag: "All Plans",
    tagColor: "text-rose-400 bg-rose-400/10",
  },
  {
    icon: <BarChart3 className="w-5 h-5 text-purple-400" />,
    title: "Analytics & Weak-Area Detection",
    description:
      "Band Achiever users get advanced attempt analytics, automatic weak-dimension detection, and personalized study suggestions to focus effort where it counts most.",
    accent: "bg-purple-400/15",
    tag: "Ultra only",
    tagColor: "text-purple-400 bg-purple-400/10",
  },
  {
    icon: <Lightbulb className="w-5 h-5 text-emerald-400" />,
    title: "Idea Generation Drills",
    description:
      "Run out of things to say? Band Achiever includes vocabulary drills and idea-generation exercises that train you to brainstorm quickly for any Speaking or Writing prompt.",
    accent: "bg-emerald-400/15",
    tag: "Ultra only",
    tagColor: "text-emerald-400 bg-emerald-400/10",
  },
];

/**
 * FeaturesGrid — 4×2 grid showing every core platform feature.
 * Tag pills tie each feature to the relevant plan tier to reinforce upsell.
 */
export function FeaturesGrid() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-surface/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            What You Get
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Every Feature Built for CELPIP — Nothing Else
          </h2>
          <p className="mt-4 text-subtle text-lg leading-relaxed">
            No generic English content. Every module, prompt, and feedback
            dimension maps directly to the official CELPIP rubric.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group celpip-card card-interactive flex flex-col gap-3"
            >
              {/* Icon + tag row */}
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

              {/* Copy */}
              <div>
                <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                <p className="mt-1 text-xs text-subtle leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
