import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { OfferingsSection } from "@/components/landing/OfferingsSection";
import { FeedbackShowcaseSection } from "@/components/landing/FeedbackShowcaseSection";
import { PricingPreview } from "@/components/landing/PricingPreview";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://celpipbro.ca";

export const metadata: Metadata = {
  // `absolute` bypasses the layout's "%s | CELPIPBRO" template so the brand
  // name isn't duplicated in the home page <title>. Canonical is inherited
  // from the root layout (alternates.canonical = "/").
  title: { absolute: "CELPIPBRO - CELPIP Speaking & Writing Practice" },
  description:
    "Practice CELPIP Speaking and Writing with timed tasks, AI band estimates, and feedback aligned to CELPIP performance standards. Start free, then unlock Pro with one payment.",
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
      {/* Skip link — first focusable element so keyboard/AT users can bypass the
          navbar and jump straight to content (WCAG 2.4.1). */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <Navbar />

      {/* JSON-LD Structured Data — WebApplication schema for rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "CELPIPBRO",
            url: SITE_URL,
            description:
              "AI-powered CELPIP Speaking and Writing practice platform with timed tasks, rubric-based scoring, and progress tracking. Independent practice tool — not affiliated with Paragon Testing Enterprises; AI band scores are practice estimates, not official CELPIP results.",
            applicationCategory: "EducationApplication",
            operatingSystem: "All",
            inLanguage: "en-CA",
            offers: [
              {
                "@type": "Offer",
                name: "Starter",
                price: "0",
                priceCurrency: "CAD",
                description: "Free plan — includes a full Speaking and Writing mock test plus focused task practice with basic band estimates.",
              },
              {
                "@type": "Offer",
                name: "Pro",
                price: "9.99",
                priceCurrency: "CAD",
                description: "One-time payment — 40 Speaking and 10 Writing practices, 2 full mock tests covering Speaking and Writing, detailed AI rubric feedback, 70 retry credits, and progress tracking.",
              },
            ],
            publisher: {
              "@type": "Organization",
              name: "CELPIPBRO",
              url: SITE_URL,
              logo: `${SITE_URL}/icon.png`,
            },
          }),
        }}
      />

      <main id="main-content">
        <HeroSection />
        <OfferingsSection />
        <FeedbackShowcaseSection />
        <PricingPreview />
        <FinalCtaSection />
      </main>

      <Footer />
    </>
  );
}
