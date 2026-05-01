import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, Mic, PenLine } from "lucide-react";

const SPEAKING_TASK_COUNT = 8;
const WRITING_TASK_COUNT = 2;

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-muted pt-20 pb-24 sm:pt-28 sm:pb-32"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div className="animate-fade-in text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-5">
              <ClipboardCheck className="w-3.5 h-3.5" />
              AI-Scored CELPIP Practice
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Practice Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">
                Target CELPIP Band
              </span>{" "}
              With Focused AI Feedback
            </h1>

            <p className="mt-5 text-base sm:text-lg text-subtle leading-relaxed max-w-lg mx-auto lg:mx-0">
              Train on every CELPIP Speaking and Writing task with timed
              practice, AI feedback aligned to official CELPIP scoring criteria,
              and a sample response after every attempt. Start with a free mock
              test.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                id="hero-cta-signup"
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-white font-semibold text-base hover:bg-primary-hover transition-colors"
              >
                Start Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                id="hero-cta-pricing"
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-surface border border-border text-foreground font-semibold text-base hover:border-primary/50 transition-colors"
              >
                See Plans
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 justify-center lg:justify-start">
              {[
                "Free mock test included",
                "One-time payment",
                "Independent CELPIP practice platform",
              ].map((chip) => (
                <span
                  key={chip}
                  className="text-xs px-3 py-1 rounded-full bg-surface border border-border text-subtle"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="hidden sm:block relative lg:pl-8 animate-fade-in animation-delay-150">
            <div className="space-y-4">
              <div className="group celpip-card card-interactive flex items-start gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Mic className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Speaking — All 8 CELPIP Task Types
                  </h3>
                  <p className="text-sm text-subtle mt-0.5">
                    Timed prep, recording, transcript, and AI feedback after
                    each practice attempt.
                  </p>
                </div>
              </div>

              <div className="group celpip-card card-interactive flex items-start gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-success/15 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                  <PenLine className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Writing — Email &amp; Opinion Response
                  </h3>
                  <p className="text-sm text-subtle mt-0.5">
                    Practice the two CELPIP Writing tasks with a timed editor,
                    word counter, and improved sample responses.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: `${SPEAKING_TASK_COUNT}`, label: "Speaking task types" },
                  { value: `${WRITING_TASK_COUNT}`, label: "Writing task types" },
                  { value: "Free", label: "To start" },
                ].map(({ value, label }) => (
                  <div key={label} className="celpip-card text-center p-4">
                    <p className="text-2xl font-bold text-primary">{value}</p>
                    <p className="text-xs text-subtle mt-1">{label}</p>
                  </div>
                ))}
              </div>

              <div className="celpip-card flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                <p className="text-sm text-subtle leading-relaxed">
                  Practice Speaking and Writing under accurate exam timing.
                  Review AI feedback and a sample response before your
                  next attempt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
