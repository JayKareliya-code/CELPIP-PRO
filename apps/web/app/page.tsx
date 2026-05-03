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
          className="py-20 sm:py-28 bg-gradient-to-br from-primary/20 via-muted to-indigo-900/20 border-t border-border"
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Try It Free. Upgrade When You&apos;re Ready to Go Further.
            </h2>
            <p className="mt-4 text-lg text-subtle leading-relaxed">
              Create a free account, complete a Speaking and Writing mock test,
              and see how CELPIPBRO scores your responses with targeted AI
              feedback.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                id="cta-band-signup"
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary text-white font-bold text-base hover:bg-primary-hover transition-colors"
              >
                Start Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                id="cta-band-pricing"
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-border text-foreground font-semibold text-base hover:border-primary/50 transition-colors"
              >
                See Plans
              </Link>
            </div>
            <p className="mt-5 text-xs text-subtle">
              No credit card to start &middot; No subscription &middot; Practice band scores are AI estimates — not official CELPIP results
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
