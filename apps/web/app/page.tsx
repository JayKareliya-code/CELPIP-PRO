import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PricingPreview } from "@/components/landing/PricingPreview";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { STARTING_PRICE_CAD } from "@/lib/constants";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CELPIPBro — Free CELPIP Mock Test + AI Feedback",
  description:
    "Start with a free CELPIP mock test. Practice all 8 Speaking tasks and 2 Writing tasks with AI rubric-based feedback. Pay once, practice until you pass.",
};

/**
 * Root landing page — shown to signed-out visitors.
 * Signed-in users are redirected straight to /dashboard.
 */
export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <>
      <Navbar />

      <main id="main-content">
        <HeroSection />
        <FeaturesGrid />
        <HowItWorksSection />
        <TestimonialsSection />
        <PricingPreview />

        {/* ── Final CTA Band ──────────────────────────────────────────── */}
        <section
          id="cta-band"
          className="py-20 sm:py-28 bg-gradient-to-br from-primary/20 via-muted to-indigo-900/20 border-t border-border"
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Your Free Mock Test is Waiting
            </h2>
            <p className="mt-4 text-lg text-subtle leading-relaxed">
              Create a free account, run a full Speaking and Writing mock test,
              and see your AI band score &mdash; before spending a single dollar.
              When you&apos;re ready to unlock all tasks and attempts, our one-time
              plans start at just ${STARTING_PRICE_CAD} CAD.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                id="cta-band-signup"
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary text-white font-bold text-base hover:bg-primary-hover transition-colors btn-glow"
              >
                Get My Free Mock Test
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                id="cta-band-pricing"
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-border text-foreground font-semibold text-base hover:border-primary/50 transition-colors"
              >
                Compare Plans
              </Link>
            </div>
            <p className="mt-5 text-xs text-subtle">
              No credit card &middot; No subscription &middot; Attempts never expire
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
