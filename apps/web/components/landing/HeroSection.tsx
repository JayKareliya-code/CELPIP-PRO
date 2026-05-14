import Link from "next/link";
import { ArrowRight, Mic, PenLine, PlayCircle, Sparkles } from "lucide-react";

const STATS = [
  { value: "8", label: "Speaking task types" },
  { value: "2", label: "Writing task types" },
  { value: "AI", label: "Scored feedback" },
];

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-black pt-20 pb-20 sm:pt-20 sm:pb-28"
    >
      {/* Ambient background glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/4 w-[800px] h-[500px] rounded-full bg-amber-500/12 blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-indigo-500/6 blur-[130px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── LEFT COLUMN — Copy & CTAs ──────────────────────────────── */}
          <div className="flex flex-col items-start">
            {/* Pill badge */}
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.12] text-white/65 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4 text-amber-400" />
              AI-Scored CELPIP Practice
            </span>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] xl:text-[3.75rem] font-extrabold tracking-tight text-white leading-[1.08]">
              Reach Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200">
                CELPIP Target Band
              </span>{" "}
              Faster With AI Feedback
            </h1>

            {/* Subheading */}
            <p className="mt-7 text-base sm:text-lg text-white/50 leading-relaxed max-w-lg">
              Practice every CELPIP Speaking and Writing task type with timed
              conditions, AI-scored feedback, and a full mock test — completely
              free to start.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link
                id="hero-cta-signup"
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-base transition-all duration-200 shadow-[0_0_32px_rgba(245,158,11,0.45)] hover:shadow-[0_0_48px_rgba(245,158,11,0.65)]"
              >
                Start Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                id="hero-cta-pricing"
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/[0.05] border border-white/[0.14] hover:border-white/[0.30] text-white/80 hover:text-white font-semibold text-base transition-all duration-200"
              >
                See Plans
              </Link>
            </div>

            {/* Trust chips */}
            <div className="mt-7 flex flex-wrap gap-2">
              {[
                "No credit card to start",
                "Free mock test included",
                "One-time payment to unlock Pro",
              ].map((chip) => (
                <span
                  key={chip}
                  className="text-xs px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.09] text-white/40"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN — Visual cards ──────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Stat strip — always 3 equal columns */}
            <div className="grid grid-cols-3 gap-4">
              {STATS.map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/[0.10] bg-white/[0.03] p-5 sm:p-6 text-center"
                >
                  <p className="text-4xl sm:text-5xl font-extrabold text-amber-400 tabular-nums leading-none">
                    {value}
                  </p>
                  <p className="mt-2 text-xs sm:text-sm text-white/40 font-medium leading-snug">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Skill cards — 2-column grid, tall */}
            <div className="grid grid-cols-2 gap-4">
              {/* Speaking */}
              <div className="flex flex-col gap-4 rounded-xl border border-white/[0.10] bg-white/[0.03] hover:border-white/[0.22] hover:bg-white/[0.05] transition-all duration-200 p-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                  <Mic className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white/90 leading-snug">
                    Speaking
                  </p>
                  <p className="text-sm text-white/40 mt-2 leading-relaxed">
                    All 8 task types · Timed prep · AI transcript · Band-level feedback
                  </p>
                </div>
              </div>

              {/* Writing */}
              <div className="flex flex-col gap-4 rounded-xl border border-white/[0.10] bg-white/[0.03] hover:border-white/[0.22] hover:bg-white/[0.05] transition-all duration-200 p-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <PenLine className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white/90 leading-snug">
                    Writing
                  </p>
                  <p className="text-sm text-white/40 mt-2 leading-relaxed">
                    Email &amp; Opinion · Timed editor · Word counter · Sample responses
                  </p>
                </div>
              </div>
            </div>

            {/* Mock test banner */}
            <div className="flex items-center gap-4 rounded-xl border border-white/[0.10] bg-white/[0.03] px-6 py-5">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                <PlayCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/85">
                  Free mock test included
                </p>
                <p className="text-sm text-white/45 mt-0.5 leading-relaxed">
                  Full speaking &amp; writing exam in one session — same structure as the real CELPIP.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
