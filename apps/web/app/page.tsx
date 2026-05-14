import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PricingPreview } from "@/components/landing/PricingPreview";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CELPIPBRO - CELPIP Speaking & Writing Practice",
  description:
    "Practice CELPIP Speaking and Writing with timed tasks, AI band estimates, and feedback aligned to CELPIP performance standards. Start free, then unlock Pro with one payment.",
  alternates: {
    canonical: "/",
  },
};

/**
 * Root landing page - shown to signed-out visitors.
 * Signed-in users are redirected straight to /dashboard.
 */
export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <>
      <Navbar />

      {/* JSON-LD Structured Data — WebApplication schema for rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "CELPIPBRO",
            url: "https://celpipbro.ca",
            description:
              "AI-powered CELPIP Speaking and Writing practice platform with timed tasks, rubric-based scoring, and progress tracking.",
            applicationCategory: "EducationApplication",
            operatingSystem: "All",
            inLanguage: "en-CA",
            offers: [
              {
                "@type": "Offer",
                name: "Starter",
                price: "0",
                priceCurrency: "CAD",
                description: "Free plan — includes 1 Speaking and 1 Writing mock test.",
              },
              {
                "@type": "Offer",
                name: "Pro",
                price: "24.99",
                priceCurrency: "CAD",
                description: "One-time payment — unlimited task practice, AI feedback, and progress tracking.",
              },
            ],
            publisher: {
              "@type": "Organization",
              name: "CELPIPBRO",
              url: "https://celpipbro.ca",
            },
          }),
        }}
      />

      <main id="main-content">
        <HeroSection />
        <FeaturesGrid />
        <HowItWorksSection />
        <TestimonialsSection />
        <PricingPreview />

        <section
          id="cta-band"
          className="relative overflow-hidden py-20 sm:py-28 bg-black border-t border-white/[0.08]"
        >
          {/* Ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-amber-500/10 blur-[120px]" />
          </div>
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4">
              Get Started Today
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white/90">
              Try It Free. Upgrade When You&apos;re Ready to Go Further.
            </h2>
            <p className="mt-5 text-base sm:text-lg text-white/45 leading-relaxed max-w-xl mx-auto">
              Create a free account, complete a Speaking and Writing mock test,
              and see how CELPIPBRO scores your responses with targeted AI
              feedback.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                id="cta-band-signup"
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-base transition-all duration-200 shadow-[0_0_28px_rgba(245,158,11,0.40)] hover:shadow-[0_0_45px_rgba(245,158,11,0.60)]"
              >
                Start Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                id="cta-band-pricing"
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/[0.05] border border-white/[0.14] hover:border-white/[0.28] text-white/70 hover:text-white font-semibold text-base transition-all duration-200"
              >
                See Plans
              </Link>
            </div>
            <p className="mt-5 text-xs text-white/30">
              No credit card to start &middot; Free mock test included &middot; AI scores are practice estimates — not official CELPIP results
            </p>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
