import { CheckCircle2, ExternalLink, FileText, Mic, Timer } from "lucide-react";
import { PRO_PLAN_LIMITS } from "@/lib/constants";

const SPEAKING_TASK_COUNT = 8;
const WRITING_TASK_COUNT  = 2;

const PROOF_CARDS = [
  {
    icon: <Mic className="w-5 h-5 text-amber-400" />,
    iconBg: "bg-amber-400/15 border-amber-400/25",
    accentBar: "bg-amber-400",
    title: "Speaking Coverage",
    stat: `${SPEAKING_TASK_COUNT} task types`,
    statColor: "text-amber-400",
    description:
      "All 8 Speaking task types — each with timed prep, timed recording, an AI-estimated band score, and dimension-level feedback so you know exactly what to improve.",
  },
  {
    icon: <FileText className="w-5 h-5 text-emerald-400" />,
    iconBg: "bg-emerald-400/15 border-emerald-400/25",
    accentBar: "bg-emerald-400",
    title: "Writing Coverage",
    stat: `${WRITING_TASK_COUNT} task types`,
    statColor: "text-emerald-400",
    description:
      "Both Writing tasks — composing an email and responding to an opinion prompt — in a timed editor with a live word counter and structured guidance.",
  },
  {
    icon: <Timer className="w-5 h-5 text-indigo-400" />,
    iconBg: "bg-indigo-400/15 border-indigo-400/25",
    accentBar: "bg-indigo-400",
    title: "Practice Volume (Pro)",
    stat: `${SPEAKING_TASK_COUNT * PRO_PLAN_LIMITS.speaking_attempts_per_task} Speaking · ${WRITING_TASK_COUNT * PRO_PLAN_LIMITS.writing_attempts_per_task} Writing`,
    statColor: "text-indigo-400",
    description:
      "Up to 40 Speaking and 10 Writing practice sessions across every task type, plus 2 full mock tests per skill — all with AI scoring.",
  },
];

const FEEDBACK_POINTS = [
  "Estimated practice band score",
  "Strengths and weaknesses",
  "Dimension-level breakdown",
  "Improved sample response",
  "Attempt history & progress tracking",
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 sm:py-32 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">
            Practice Coverage
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white/90">
            Everything You Need to Practice Speaking and Writing
          </h2>
          <p className="mt-4 text-white/45 text-lg leading-relaxed">
            Build confidence through timed practice, targeted feedback, and
            a clear path from your first mock test to your target band.
          </p>
        </div>

        {/* Coverage cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROOF_CARDS.map((card) => (
            <div
              key={card.title}
              className="relative rounded-xl border border-white/[0.10] bg-white/[0.03] hover:border-white/[0.22] hover:bg-white/[0.05] transition-all duration-200 p-6 flex flex-col gap-4 overflow-hidden"
            >
              {/* Top accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-px ${card.accentBar} opacity-60`} />

              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${card.iconBg}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest">
                  {card.title}
                </p>
                <h3 className={`mt-1 text-xl font-bold tabular-nums ${card.statColor}`}>
                  {card.stat}
                </h3>
              </div>
              <p className="text-sm text-white/45 leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>

        {/* Lower row: feedback + grounding */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="rounded-xl border border-white/[0.10] bg-white/[0.03] p-6">
            <h3 className="text-base font-bold text-white/85">What Feedback Includes</h3>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FEEDBACK_POINTS.map((point) => (
                <div key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-white/65">{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.10] bg-white/[0.03] p-6 flex flex-col gap-4">
            <h3 className="text-base font-bold text-white/85">
              Grounded in Public CELPIP Information
            </h3>
            <p className="text-sm text-white/45 leading-relaxed flex-1">
              Prompts, scoring dimensions, and sample responses are structured around the
              same Speaking and Writing criteria used in the real exam — so your
              feedback is always exam-relevant, never generic.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="https://www.celpip.ca/celpip-general/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                CELPIP General test format
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://www.celpip.ca/take-celpip/test-results/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                CELPIP performance standards
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
