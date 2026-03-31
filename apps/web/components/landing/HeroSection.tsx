import Link from "next/link";
import { ArrowRight, Mic, PenLine, Star, Zap } from "lucide-react";

/**
 * HeroSection — Top of the landing page.
 * Two-column layout on desktop: headline + CTAs left, stat cards right.
 * Transparent navbar sits above (sticky), so hero has top padding to clear it.
 */
export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-muted pt-20 pb-24 sm:pt-28 sm:pb-32"
    >
      {/* Ambient glow blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/10 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-20 right-0 w-[400px] h-[400px] rounded-full bg-indigo-500/8 blur-[100px]"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* ── Left: copy ─────────────────────────────────────────────── */}
          <div className="animate-fade-in">
            {/* Small badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Zap className="w-3.5 h-3.5" />
              AI-Powered CELPIP Practice
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Hit Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">
                Target Band
              </span>{" "}
              — Free Mock Test Inside
            </h1>

            <p className="mt-6 text-lg text-subtle leading-relaxed max-w-lg">
              Practice every CELPIP Speaking and Writing task with AI-powered,
              rubric-based feedback. Start with a free mock test — no credit card,
              no subscription, no fluff. Just results.
            </p>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                id="hero-cta-signup"
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-white font-semibold text-base hover:bg-primary-hover transition-colors btn-glow"
              >
                Try Free Mock Test
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                id="hero-cta-pricing"
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-surface border border-border text-foreground font-semibold text-base hover:border-primary/50 transition-colors"
              >
                View Plans
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-8 flex items-center gap-4 text-sm text-subtle">
              <div className="flex -space-x-2">
                {["J", "M", "A", "P", "S"].map((initial) => (
                  <div
                    key={initial}
                    className="w-8 h-8 rounded-full bg-primary/20 border-2 border-muted flex items-center justify-center text-xs font-semibold text-primary"
                  >
                    {initial}
                  </div>
                ))}
              </div>
              <p>
                <span className="text-foreground font-semibold">2,400+</span>{" "}
                candidates already improving
              </p>
            </div>

            {/* Trust chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "✓ Free mock test",
                "✓ One-time payment",
                "✓ Attempts never expire",
              ].map((chip) => (
                <span key={chip} className="text-xs px-3 py-1 rounded-full bg-surface border border-border text-subtle">
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* ── Right: stat cards ──────────────────────────────────────── */}
          <div className="relative lg:pl-8 animate-fade-in animation-delay-150">
            {/* Main feature cards */}
            <div className="space-y-4">

              {/* Speaking card */}
              <div className="group celpip-card card-interactive flex items-start gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Mic className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Speaking — All 8 Tasks</h3>
                  <p className="text-sm text-subtle mt-0.5">Task practice + full mock tests · AI rubric scores</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-warning text-warning" />
                    ))}
                    <span className="text-xs text-subtle ml-1">Up to 15 attempts / task</span>
                  </div>
                </div>
              </div>

              {/* Writing card */}
              <div className="group celpip-card card-interactive flex items-start gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-success/15 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                  <PenLine className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Writing — Email & Essay</h3>
                  <p className="text-sm text-subtle mt-0.5">Timed editor · Word counter · Improved samples</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-warning text-warning" />
                    ))}
                    <span className="text-xs text-subtle ml-1">AI strengths & weaknesses</span>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "15×",  label: "Attempts / task" },
                  { value: "5",    label: "Full mock tests" },
                  { value: "Free", label: "To start" },
                ].map(({ value, label }) => (
                  <div
                    key={label}
                    className="celpip-card text-center p-4"
                  >
                    <p className="text-2xl font-bold text-primary">{value}</p>
                    <p className="text-xs text-subtle mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
