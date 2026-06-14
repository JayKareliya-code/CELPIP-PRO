import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCtaSection() {
  return (
    <section
      id="cta-band"
      className="relative overflow-hidden border-t border-white/[0.08] bg-black py-20 sm:py-28"
    >
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold text-white/90 sm:text-4xl">
          Start free. Go Pro when you&apos;re ready.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg">
          Create a free account and take a full Speaking and Writing mock test. You&apos;ll see
          the band each answer earned, plus the changes that would raise it next time.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            id="cta-band-signup"
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-[0_0_28px_rgba(200,150,62,0.40)] transition-all duration-200 hover:bg-primary-hover hover:shadow-[0_0_45px_rgba(200,150,62,0.60)]"
          >
            Start Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            id="cta-band-pricing"
            href="#pricing"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.05] px-8 py-4 text-base font-semibold text-white/70 transition-all duration-200 hover:border-white/[0.28] hover:text-white"
          >
            See Plans
          </Link>
        </div>

        <p className="mt-5 text-xs text-white/55">
          No credit card to start &middot; Free mock test included &middot; AI scores are practice
          estimates, not official CELPIP results &middot; Not affiliated with Paragon Testing
          Enterprises
        </p>
      </div>
    </section>
  );
}
