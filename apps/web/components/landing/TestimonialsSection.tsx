import { CheckCircle2, ExternalLink, FileText, Mic, Timer } from "lucide-react";
import { ULTRA_PLAN_LIMITS } from "@/lib/constants";

const SPEAKING_TASK_COUNT = 8;
const WRITING_TASK_COUNT = 2;

const PROOF_CARDS = [
  {
    icon: <Mic className="w-5 h-5 text-primary" />,
    title: "Speaking Coverage",
    stat: `${SPEAKING_TASK_COUNT} task types`,
    description:
      "Tackle all 8 Speaking task types — each with timed prep, timed recording, an AI-estimated band score, and dimension-level feedback so you know exactly what to improve.",
  },
  {
    icon: <FileText className="w-5 h-5 text-success" />,
    title: "Writing Coverage",
    stat: `${WRITING_TASK_COUNT} task types`,
    description:
      "Practise both Writing tasks: composing an email and responding to an opinion prompt — in a timed editor with a live word counter.",
  },
  {
    icon: <Timer className="w-5 h-5 text-warning" />,
    title: "Practice Volume",
    stat: `${SPEAKING_TASK_COUNT * ULTRA_PLAN_LIMITS.speaking_attempts_per_task} speaking + ${WRITING_TASK_COUNT * ULTRA_PLAN_LIMITS.writing_attempts_per_task} writing`,
    description:
      "Up to 120 Speaking and 30 Writing practice sessions across every task type — plus full mock tests.",
  },
];

const FEEDBACK_POINTS = [
  "Estimated practice band score",
  "Strengths and weaknesses",
  "Dimension-level feedback",
  "Improved sample response",
  "Attempt history and progress tracking",
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-16 sm:py-28 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            Practice Coverage
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Everything You Need to Practise Speaking and Writing
          </h2>
          <p className="mt-4 text-subtle text-lg leading-relaxed">
            Build confidence through timed practice, targeted feedback, and
            a clear path from your first mock test to your target band score.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PROOF_CARDS.map((card) => (
            <div
              key={card.title}
              className="relative rounded-2xl bg-surface border border-border p-5 sm:p-7 flex flex-col gap-4 hover:border-primary/30 transition-all duration-200"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                {card.icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {card.title}
                </p>
                <h3 className="mt-1 text-2xl font-bold text-foreground">
                  {card.stat}
                </h3>
              </div>
              <p className="text-sm text-subtle leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5">
          <div className="rounded-2xl bg-surface border border-border p-6">
            <h3 className="text-lg font-bold text-foreground">
              What Feedback Includes
            </h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FEEDBACK_POINTS.map((point) => (
                <div key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground/85">{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-surface border border-border p-6">
            <h3 className="text-lg font-bold text-foreground">
              Grounded in Public CELPIP Information
            </h3>
            <p className="mt-3 text-sm text-subtle leading-relaxed">
              Practice prompts, scoring dimensions, and sample responses are
              structured around the same Speaking and Writing criteria used in
              the real exam — so your feedback is always exam-relevant, not
              generic.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href="https://www.celpip.ca/celpip-general/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover"
              >
                CELPIP General test format
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://www.celpip.ca/take-celpip/test-results/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover"
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
