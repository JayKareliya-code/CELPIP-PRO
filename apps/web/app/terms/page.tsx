import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the CELPIPBRO Terms of Service to understand the rules, rights, and responsibilities that govern your use of our AI-powered CELPIP practice platform.",
  alternates: {
    canonical: "/terms",
  },
};

const LAST_UPDATED = "April 22, 2026";
const EFFECTIVE_DATE = "April 22, 2026";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0D0F17] text-white">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-amber-500/10 blur-[120px]" />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30 mb-6">
            <ShieldCheck className="h-8 w-8 text-amber-400" />
          </div>

          <h1 className="text-4xl font-black tracking-tight mb-3">
            Terms of Service
          </h1>
          <p className="text-white/50 text-sm">
            Effective {EFFECTIVE_DATE} &nbsp;·&nbsp; Last updated {LAST_UPDATED}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to CELPIPBRO
        </Link>

        {/* Intro callout */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-5">
          <p className="text-sm text-white/70 leading-relaxed">
            Welcome to <strong className="text-white">CELPIPBRO</strong> — an
            AI-powered platform designed to help you prepare for the Canadian
            English Language Proficiency Index Program (CELPIP) exam. By
            accessing or using our platform, you agree to these Terms of
            Service. Please read them carefully.
          </p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>
            By creating an account or using any part of CELPIPBRO (
            <strong className="text-white">&ldquo;CELPIPBRO,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;</strong>
            ), you agree to be bound by these Terms of Service and our{" "}
            <Link href="/privacy" className="text-amber-400 underline hover:text-amber-300 transition-colors">
              Privacy Policy
            </Link>
            . If you do not agree with any part of these terms, you must not use
            the platform.
          </p>
          <p className="mt-3">
            We may update these Terms from time to time. Continued use of the
            platform after changes are posted constitutes your acceptance of
            the updated Terms.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p>
            CELPIPBRO provides AI-powered CELPIP practice tools, including:
          </p>
          <ul>
            <li>Speaking and Writing mock exam simulations</li>
            <li>AI-generated rubric-based scoring and feedback</li>
            <li>Progress tracking and performance analytics</li>
            <li>Audio recording and transcription</li>
          </ul>
          <p className="mt-3">
            CELPIPBRO is an independent practice platform and is{" "}
            <strong className="text-white">not affiliated with, endorsed by,
              or connected to Paragon Testing Enterprises</strong>, the official
            administrator of the CELPIP examination. Scores provided are
            AI-estimated and are{" "}
            <strong className="text-white">not official CELPIP results</strong>.
          </p>
        </Section>

        <Section title="3. Eligibility">
          <p>
            You must be at least <strong className="text-white">13 years of age</strong>{" "}
            to use CELPIPBRO. By using the platform you represent and warrant
            that you meet this requirement and that all registration information
            you provide is accurate and truthful.
          </p>
        </Section>

        <Section title="4. Account Registration">
          <p>
            You are responsible for maintaining the confidentiality of your
            account credentials. You agree to notify us immediately of any
            unauthorized use of your account. CELPIPBRO is not liable for any
            loss or damage arising from your failure to protect your account.
          </p>
          <p className="mt-3">
            Each account is for a single individual user. You may not share,
            transfer, or sell your account.
          </p>
        </Section>

        <Section title="5. Subscription and Payment">
          <p>
            Certain features of CELPIPBRO require a paid subscription. All
            payments are processed securely through{" "}
            <strong className="text-white">Stripe</strong>. By purchasing a
            subscription, you agree to pay the fees associated with your
            selected plan.
          </p>
          <ul>
            <li>
              <strong className="text-white">One-time payments:</strong> Where
              applicable, one-time purchases grant access for the specified
              duration with no automatic renewal.
            </li>
            <li>
              <strong className="text-white">Refunds:</strong> All purchases
              are final. We offer refunds solely at our discretion, and only
              when the platform has not delivered the described service.
            </li>
            <li>
              <strong className="text-white">Price changes:</strong> We reserve
              the right to change subscription prices with reasonable notice.
            </li>
          </ul>
        </Section>

        <Section title="6. Acceptable Use">
          <p>You agree <strong className="text-white">not</strong> to:</p>
          <ul>
            <li>Use CELPIPBRO for any unlawful purpose</li>
            <li>
              Share, resell, redistribute, or publicly post AI-generated
              feedback or content from the platform without our prior written
              consent
            </li>
            <li>
              Attempt to reverse-engineer, scrape, or extract AI models,
              prompts, or scoring logic
            </li>
            <li>
              Create accounts using false identities or on behalf of another
              person without consent
            </li>
            <li>
              Interfere with or disrupt the security or integrity of the
              platform or its servers
            </li>
            <li>
              Upload malicious, offensive, or illegal content during speaking
              or writing exercises
            </li>
          </ul>
        </Section>

        <Section title="7. Intellectual Property">
          <p>
            All content on CELPIPBRO — including but not limited to prompts,
            scoring rubrics, UI design, brand assets, and AI feedback — is the
            intellectual property of CELPIPBRO or its licensors and is
            protected by applicable copyright, trademark, and other laws.
          </p>
          <p className="mt-3">
            You are granted a limited, non-exclusive, non-transferable license
            to access and use the platform for your personal, non-commercial
            study purposes only.
          </p>
        </Section>

        <Section title="8. User-Generated Content">
          <p>
            When you submit speaking recordings or writing responses, you grant
            CELPIPBRO a limited license to process your content using AI models
            for the sole purpose of generating feedback and tracking your
            progress. We do not sell your content to third parties.
          </p>
          <p className="mt-3">
            You retain ownership of your submitted content and may request its
            deletion at any time via your account settings or by contacting us.
          </p>
        </Section>

        <Section title="9. AI Disclaimer">
          <p>
            Scores and feedback generated on CELPIPBRO are produced by
            artificial intelligence and are provided for{" "}
            <strong className="text-white">educational and practice
              purposes only</strong>. They do not constitute official CELPIP
            test results, professional language assessment, or guarantees of
            exam performance. CELPIPBRO makes no warranty that AI feedback
            will be error-free or consistently accurate.
          </p>
        </Section>

        <Section title="10. Privacy">
          <p>
            Your privacy matters to us. Please review our{" "}
            <Link href="/privacy" className="text-amber-400 underline hover:text-amber-300 transition-colors">
              Privacy Policy
            </Link>{" "}
            to understand how we collect, use, and protect your personal
            information.
          </p>
        </Section>

        <Section title="11. Termination">
          <p>
            We reserve the right to suspend or terminate your account at any
            time, with or without notice, if we determine that you have
            violated these Terms or if continued access poses a risk to the
            platform or other users.
          </p>
          <p className="mt-3">
            Upon termination, your right to access the platform ceases
            immediately. Provisions that by their nature should survive
            termination will remain in effect.
          </p>
        </Section>

        <Section title="12. Disclaimer of Warranties">
          <p>
            CELPIPBRO is provided on an{" "}
            <strong className="text-white">&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>{" "}
            basis without warranties of any kind, express or implied, including
            but not limited to implied warranties of merchantability, fitness
            for a particular purpose, or non-infringement. We do not warrant
            that the platform will be uninterrupted, error-free, or free of
            viruses or other harmful components.
          </p>
        </Section>

        <Section title="13. Limitation of Liability">
          <p>
            To the fullest extent permitted by applicable law, CELPIPBRO and
            its affiliates, officers, and employees shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages
            arising from your use of (or inability to use) the platform,
            including but not limited to lost profits, loss of data, or
            reputational harm, even if we have been advised of the possibility
            of such damages.
          </p>
        </Section>

        <Section title="14. Governing Law">
          <p>
            These Terms shall be governed by and construed in accordance with
            the laws of the <strong className="text-white">Province of Ontario, Canada</strong>,
            without regard to its conflict of law provisions.
          </p>
        </Section>

        <Section title="15. Contact Us">
          <p>
            If you have questions about these Terms of Service, please contact
            us at:
          </p>
          <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-sm text-white/70">
            <p className="font-semibold text-white">CELPIPBRO Support</p>
            <p className="mt-1">
              Email:{" "}
              <a
                href="mailto:support@celpipbro.ca"
                className="text-amber-400 hover:text-amber-300 transition-colors"
              >
                support@celpipbro.ca
              </a>
            </p>
          </div>
        </Section>

        {/* Footer separator */}
        <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
          <span>© {new Date().getFullYear()} CELPIPBRO. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-amber-400 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-amber-400 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reusable section component ─────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold text-white mb-3 pb-2 border-b border-white/[0.06]">
        {title}
      </h2>
      <div className="text-sm text-white/60 leading-relaxed space-y-2 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:text-white/60">
        {children}
      </div>
    </section>
  );
}
