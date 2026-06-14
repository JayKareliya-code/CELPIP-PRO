import Link from "next/link";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { PLAN_PRICING } from "@/lib/constants";
import { HeroReportPreview } from "./HeroReportPreview";

// Compact trust/spec row shown under the CTAs.
const HERO_SPECS = [
  { value: "8", label: "Speaking tasks" },
  { value: "2", label: "Writing tasks" },
  { value: "1–12", label: "Band scale" },
  { value: "70", label: "Retry credits" },
];

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-black pt-20 pb-24 sm:pt-28 sm:pb-32"
    >
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/4 h-[520px] w-[800px] rounded-full bg-primary/12 blur-[150px]" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-emerald-500/[0.07] blur-[140px]" />
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

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">

          {/* ── LEFT — copy ──────────────────────────────────────────────── */}
          <div className="flex flex-col items-start">
            <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/70">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-scored practice for the CELPIP General test
            </span>

            <h1 className="text-4xl font-extrabold leading-[1.07] tracking-tight text-white sm:text-5xl lg:text-[3.25rem] xl:text-[3.6rem]">
              Score Higher on{" "}
              <span className="bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                CELPIP Speaking &amp; Writing
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg">
              Practice every Speaking and Writing task under real exam timing, then get an AI
              band estimate with{" "}
              <span className="font-medium text-white/80">clear feedback on what to fix</span>.
              Your first full mock test is free.
            </p>

            {/* CTAs */}
            <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                id="hero-cta-signup"
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-[0_0_32px_rgba(200,150,62,0.45)] transition-all duration-200 hover:bg-primary-hover hover:shadow-[0_0_48px_rgba(200,150,62,0.65)]"
              >
                Start Free
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                id="hero-cta-pricing"
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.05] px-8 py-4 text-base font-semibold text-white/80 transition-all duration-200 hover:border-white/[0.30] hover:text-white"
              >
                See Plans
              </Link>
            </div>

            {/* Trust chips */}
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                "No credit card to start",
                "Free full mock test",
                `One-time ${PLAN_PRICING.pro.priceLabel} — no subscription`,
              ].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.05] px-3.5 py-1.5 text-xs text-white/55"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/70" />
                  {chip}
                </span>
              ))}
            </div>

            {/* Spec strip */}
            <div className="mt-10 grid w-full max-w-md grid-cols-2 gap-3 border-t border-white/[0.07] pt-7 sm:grid-cols-4">
              {HERO_SPECS.map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl font-extrabold leading-none tabular-nums text-primary sm:text-3xl">
                    {value}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium leading-tight text-white/55 sm:text-xs">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT — animated report preview ──────────────────────────── */}
          <HeroReportPreview />

        </div>
      </div>
    </section>
  );
}
