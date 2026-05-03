import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how CELPIPBRO collects, uses, and protects your personal information when you use our AI-powered CELPIP practice platform.",
  alternates: {
    canonical: "/privacy",
  },
};

const LAST_UPDATED = "April 22, 2026";
const EFFECTIVE_DATE = "April 22, 2026";

export default function PrivacyPolicyPage() {
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
            <Lock className="h-8 w-8 text-amber-400" />
          </div>

          <h1 className="text-4xl font-black tracking-tight mb-3">
            Privacy Policy
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
            At <strong className="text-white">CELPIPBRO</strong>, your privacy
            is important to us. This Privacy Policy explains what information
            we collect, how we use it, and the choices you have. It applies to
            all users of our platform and complies with applicable Canadian
            privacy law (PIPEDA) and, where relevant, the European General
            Data Protection Regulation (GDPR).
          </p>
        </div>

        <Section title="1. Who We Are">
          <p>
            CELPIPBRO is an AI-powered CELPIP exam preparation platform
            operated independently. We are not affiliated with Paragon Testing
            Enterprises or any official CELPIP body.
          </p>
          <p className="mt-3">
            For privacy inquiries, contact us at:{" "}
            <a
              href="mailto:support@CELPIPBRO.ca"
              className="text-amber-400 hover:text-amber-300 transition-colors underline"
            >
              support@CELPIPBRO.ca
            </a>
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We collect the following categories of information:</p>

          <SubHeading>2a. Account Information</SubHeading>
          <ul>
            <li>Name and email address (collected via Clerk authentication)</li>
            <li>Profile picture (if using Google/social sign-in)</li>
            <li>Account plan and subscription status</li>
          </ul>

          <SubHeading>2b. Practice & Usage Data</SubHeading>
          <ul>
            <li>Speaking audio recordings submitted for AI evaluation</li>
            <li>Writing responses submitted for AI evaluation</li>
            <li>AI-generated scores and feedback tied to your account</li>
            <li>Practice session history and progress statistics</li>
          </ul>

          <SubHeading>2c. Payment Information</SubHeading>
          <ul>
            <li>
              Payment is processed by{" "}
              <strong className="text-white">Stripe</strong>. CELPIPBRO does
              not store credit card numbers or raw payment details. We receive
              transaction metadata such as plan type, payment status, and
              billing date.
            </li>
          </ul>

          <SubHeading>2d. Technical & Diagnostic Data</SubHeading>
          <ul>
            <li>IP address and approximate location</li>
            <li>Browser type, device type, and operating system</li>
            <li>Error logs and performance diagnostics (via Sentry)</li>
            <li>Feature usage patterns (aggregated, anonymized)</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use your information to:</p>
          <ul>
            <li>Provide, maintain, and improve the CELPIPBRO platform</li>
            <li>Process and deliver AI-generated feedback on your practice submissions</li>
            <li>Track your progress and generate performance analytics</li>
            <li>Manage your account, subscription, and billing</li>
            <li>Send you important service communications (e.g., payment receipts, policy updates)</li>
            <li>Detect and prevent fraud, abuse, and security incidents</li>
            <li>Comply with applicable legal obligations</li>
          </ul>
          <p className="mt-3">
            We do <strong className="text-white">not</strong> sell your
            personal information to third parties. We do not use your practice
            content for training AI models shared externally without explicit
            opt-in consent.
          </p>
        </Section>

        <Section title="4. How We Share Your Information">
          <p>
            We share information only with trusted service providers who help
            us operate the platform, under strict data processing agreements:
          </p>
          <ul>
            <li>
              <strong className="text-white">Clerk</strong> — Authentication
              and identity management
            </li>
            <li>
              <strong className="text-white">Stripe</strong> — Secure payment
              processing
            </li>
            <li>
              <strong className="text-white">OpenAI / AI Providers</strong> —
              Processing your submissions to generate AI feedback. Audio
              transcription and text scoring are performed via API calls that
              are not used to train third-party models by default.
            </li>
            <li>
              <strong className="text-white">AWS S3</strong> — Secure storage
              of audio recordings and exported data files
            </li>
            <li>
              <strong className="text-white">Sentry</strong> — Error
              monitoring and crash diagnostics
            </li>
          </ul>
          <p className="mt-3">
            We may also disclose your information if required by law, court
            order, or to protect the rights and safety of CELPIPBRO or its
            users.
          </p>
        </Section>

        <Section title="5. Data Retention">
          <p>
            We retain your personal data for as long as your account is active
            or as needed to provide the service. Specifically:
          </p>
          <ul>
            <li>
              <strong className="text-white">Account data</strong> is retained
              until you delete your account.
            </li>
            <li>
              <strong className="text-white">Audio recordings</strong> are
              retained for up to 90 days by default and can be deleted on
              request.
            </li>
            <li>
              <strong className="text-white">AI feedback and scores</strong>{" "}
              are retained indefinitely to support your historical progress
              view, unless you request deletion.
            </li>
            <li>
              <strong className="text-white">Payment records</strong> are
              retained for the period required by applicable tax and financial
              regulations (typically 7 years).
            </li>
          </ul>
        </Section>

        <Section title="6. Your Rights">
          <p>
            Depending on your location, you may have the following rights
            regarding your personal information:
          </p>
          <ul>
            <li>
              <strong className="text-white">Access:</strong> Request a copy
              of the personal data we hold about you.
            </li>
            <li>
              <strong className="text-white">Correction:</strong> Request
              correction of inaccurate or incomplete data.
            </li>
            <li>
              <strong className="text-white">Deletion:</strong> Request
              deletion of your account and associated personal data.
            </li>
            <li>
              <strong className="text-white">Data portability:</strong> Request
              an export of your data in a machine-readable format.
            </li>
            <li>
              <strong className="text-white">Objection / Restriction:</strong>{" "}
              Object to or restrict certain types of processing.
            </li>
            <li>
              <strong className="text-white">Withdraw consent:</strong> Where
              processing is based on consent, withdraw it at any time.
            </li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, contact us at{" "}
            <a
              href="mailto:support@CELPIPBRO.ca"
              className="text-amber-400 hover:text-amber-300 transition-colors underline"
            >
              support@CELPIPBRO.ca
            </a>
            . We will respond within 30 days.
          </p>
        </Section>

        <Section title="7. Cookies and Tracking">
          <p>
            CELPIPBRO uses minimal cookies required for the platform to
            function — specifically authentication session cookies managed by
            Clerk. We do not currently use advertising cookies or third-party
            tracking pixels.
          </p>
          <p className="mt-3">
            You may manage or delete cookies through your browser settings.
            Note that disabling authentication cookies will prevent you from
            accessing your account.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            We implement industry-standard security measures to protect your
            data, including:
          </p>
          <ul>
            <li>TLS encryption for all data in transit</li>
            <li>Encrypted storage for sensitive data at rest</li>
            <li>Role-based access controls limiting who can access production data</li>
            <li>Automated error monitoring and alerting via Sentry</li>
          </ul>
          <p className="mt-3">
            No method of transmission over the internet is 100% secure. In the
            event of a data breach affecting your rights and freedoms, we will
            notify you as required by applicable law.
          </p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            CELPIPBRO is not directed to children under the age of{" "}
            <strong className="text-white">13</strong>. We do not knowingly
            collect personal information from children. If you believe a child
            has provided us with personal information, please contact us and
            we will promptly delete it.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy periodically to reflect changes
            in our practices or for legal, operational, or regulatory reasons.
            When we make material changes, we will notify you via email or
            through the platform before the changes take effect. The &ldquo;Last
            updated&rdquo; date at the top of this page will always reflect the most
            recent revision.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p>
            If you have questions, concerns, or requests regarding this Privacy
            Policy, please reach out:
          </p>
          <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-sm text-white/70">
            <p className="font-semibold text-white">CELPIPBRO Privacy Team</p>
            <p className="mt-1">
              Email:{" "}
              <a
                href="mailto:support@CELPIPBRO.ca"
                className="text-amber-400 hover:text-amber-300 transition-colors"
              >
                support@CELPIPBRO.ca
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

// ── Reusable components ────────────────────────────────────────────────────────

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

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 mb-1 font-semibold text-white/80">{children}</p>
  );
}
