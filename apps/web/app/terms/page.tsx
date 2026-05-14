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

const LAST_UPDATED = "May 14, 2026";
const EFFECTIVE_DATE = "May 14, 2026";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0D0F17] text-white">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-amber-500/10 blur-[120px]" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30 mb-6">
            <ShieldCheck className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-3">
            Terms of Service
          </h1>
          <p className="text-white/50 text-sm">
            Effective {EFFECTIVE_DATE}&nbsp;·&nbsp;Last updated {LAST_UPDATED}
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
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-5 space-y-3">
          <p className="text-sm text-white/70 leading-relaxed">
            Welcome to <strong className="text-white">CELPIPBRO</strong>. These
            Terms of Service explain the rules that apply when you access or use
            CELPIPBRO&rsquo;s website, application, practice tools, mock tests,
            account features, payment features, and related services.
          </p>
          <p className="text-sm text-white/70 leading-relaxed">
            CELPIPBRO is operated by an independent solo entrepreneur based in
            Quebec, Canada. In these Terms,{" "}
            <strong className="text-white">
              &ldquo;CELPIPBRO,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo;
            </strong>{" "}
            and{" "}
            <strong className="text-white">&ldquo;our&rdquo;</strong> refer to
            CELPIPBRO and the person operating the CELPIPBRO platform.{" "}
            <strong className="text-white">
              &ldquo;You&rdquo; and &ldquo;your&rdquo;
            </strong>{" "}
            refer to the person accessing or using CELPIPBRO.
          </p>
          <p className="text-sm text-white/70 leading-relaxed">
            By creating an account, purchasing a plan or add-on, or using any
            part of CELPIPBRO, you agree to these Terms and our{" "}
            <Link
              href="/privacy"
              className="text-amber-400 underline hover:text-amber-300 transition-colors"
            >
              Privacy Policy
            </Link>
            . If you do not agree, you must not use CELPIPBRO.
          </p>
        </div>

        {/* ── Sections ── */}

        <Section title="1. Description of Service">
          <p>
            CELPIPBRO is an AI-powered CELPIP practice platform designed to
            help users prepare for the Canadian English Language Proficiency
            Index Program test.
          </p>
          <p className="mt-3">CELPIPBRO may provide features such as:</p>
          <ul>
            <li>Speaking practice tasks</li>
            <li>Writing practice tasks</li>
            <li>Timed mock tests</li>
            <li>Voice recording</li>
            <li>Transcription</li>
            <li>AI-generated feedback</li>
            <li>Estimated CELPIP band scores</li>
            <li>Improved sample responses</li>
            <li>Vocabulary, grammar, fluency, and structure suggestions</li>
            <li>Practice history and progress tracking</li>
            <li>Learning materials</li>
            <li>Paid plans, attempts, credits, bundles, or add-ons</li>
          </ul>
          <p className="mt-3">
            CELPIPBRO is a practice and learning tool only. It does not provide
            official CELPIP scores, immigration advice, legal advice, or
            guaranteed exam results.
          </p>
        </Section>

        <Section title="2. Independent Platform Disclaimer">
          <p>CELPIPBRO is an independent practice platform.</p>
          <p className="mt-3">
            CELPIPBRO is{" "}
            <strong className="text-white">
              not affiliated with, endorsed by, sponsored by, approved by, or
              officially connected
            </strong>{" "}
            to Paragon Testing Enterprises, Prometric Canada, or any official
            CELPIP test administrator.
          </p>
          <p className="mt-3">
            All CELPIP-related names, trademarks, logos, and marks belong to
            their respective owners. CELPIPBRO uses CELPIP-related references
            only to describe the type of exam practice the platform is designed
            to support.
          </p>
        </Section>

        <Section title="3. Eligibility">
          <p>
            You must be at least{" "}
            <strong className="text-white">14 years old</strong> to use
            CELPIPBRO.
          </p>
          <p className="mt-3">
            If you are under the age of majority in your province, state, or
            country of residence, you may use CELPIPBRO only with the
            involvement and consent of a parent or legal guardian where required
            by law.
          </p>
          <p className="mt-3">By using CELPIPBRO, you confirm that:</p>
          <ul>
            <li>You meet the age requirement</li>
            <li>You have the legal ability to agree to these Terms</li>
            <li>The information you provide is accurate and complete</li>
            <li>
              You will use the platform only for lawful and personal study
              purposes
            </li>
          </ul>
        </Section>

        <Section title="4. Account Registration">
          <p>Some features require an account.</p>
          <p className="mt-3">
            Account registration, login, and authentication are handled through{" "}
            <strong className="text-white">Clerk</strong>. You are responsible
            for maintaining the confidentiality of your login credentials and
            for all activity under your account.
          </p>
          <p className="mt-3">You agree not to:</p>
          <ul>
            <li>Share your account with another person</li>
            <li>Sell, transfer, or assign your account</li>
            <li>Create an account using false information</li>
            <li>Use another person&rsquo;s account without permission</li>
            <li>
              Attempt to bypass account limits, payment limits, or usage
              restrictions
            </li>
          </ul>
          <p className="mt-3">
            If you believe your account has been compromised, contact us at{" "}
            <a
              href="mailto:support@celpipbro.ca"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              support@celpipbro.ca
            </a>
            .
          </p>
        </Section>

        <Section title="5. Plans, Purchases, Attempts, and Add-Ons">
          <p>
            CELPIPBRO may offer free features, paid plans, one-time purchases,
            practice attempts, mock tests, credits, bundles, add-ons, or other
            paid features.
          </p>
          <p className="mt-3">
            The specific features, limits, access period, expiry period, number
            of attempts, and price of each plan or add-on will be shown on the
            pricing page, checkout page, or inside the platform.
          </p>
          <p className="mt-3">Unless clearly stated otherwise at checkout:</p>
          <ul>
            <li>Paid purchases are one-time purchases</li>
            <li>Paid purchases do not automatically renew</li>
            <li>
              Attempts, credits, mock tests, bundles, or add-ons may be limited
              by quantity, plan type, or access period
            </li>
            <li>
              Unused attempts or credits may expire if an expiry period is
              stated at purchase
            </li>
            <li>Features may vary between free and paid plans</li>
            <li>Add-ons may depend on your existing plan level</li>
          </ul>
          <p className="mt-3">
            We may change our plans, prices, features, limits, or add-ons from
            time to time. Changes will not reduce access you already purchased
            during the stated access period, unless required for legal,
            security, abuse-prevention, or technical reasons.
          </p>
        </Section>

        <Section title="6. Payments">
          <p>
            Payments are processed securely through{" "}
            <strong className="text-white">Stripe</strong>.
          </p>
          <p className="mt-3">
            By making a purchase, you agree to pay the price shown at checkout,
            including any applicable taxes. You also agree that Stripe may
            process your payment information according to Stripe&rsquo;s own
            terms and privacy policy.
          </p>
          <p className="mt-3">
            CELPIPBRO does not store full credit card numbers on its own
            servers.
          </p>
          <p className="mt-3">
            A purchase is not complete until payment is successfully processed.
            If a payment fails, is reversed, is disputed, or is suspected to be
            fraudulent, we may suspend or remove access to the related paid
            features.
          </p>
        </Section>

        <Section title="7. Refunds">
          <p>
            Because CELPIPBRO provides digital practice tools and AI-generated
            services that may become available immediately after purchase, all
            purchases are generally{" "}
            <strong className="text-white">final</strong> unless otherwise
            required by law.
          </p>
          <p className="mt-3">
            We may consider refund requests at our discretion, especially where:
          </p>
          <ul>
            <li>A duplicate payment was made by mistake</li>
            <li>
              A paid feature was not delivered due to a technical issue caused
              by CELPIPBRO
            </li>
            <li>A billing error occurred</li>
          </ul>
          <p className="mt-3">
            We generally do <strong className="text-white">not</strong> provide
            refunds because:
          </p>
          <ul>
            <li>You changed your mind after using the service</li>
            <li>You did not achieve your desired CELPIP score</li>
            <li>You disagree with an AI-estimated band score</li>
            <li>
              You did not use all attempts, credits, or mock tests before expiry
            </li>
            <li>
              Your official CELPIP result differs from CELPIPBRO&rsquo;s
              estimated score
            </li>
          </ul>
          <p className="mt-3">
            To request a refund review, contact{" "}
            <a
              href="mailto:support@celpipbro.ca"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              support@celpipbro.ca
            </a>
            .
          </p>
        </Section>

        <Section title="8. User Content">
          <p>
            When you submit writing responses, voice recordings, transcripts,
            answers, comments, or other content to CELPIPBRO, you retain
            ownership of your content.
          </p>
          <p className="mt-3">
            You grant CELPIPBRO a limited, non-exclusive, worldwide license to
            host, store, process, transmit, display, and use your content only
            as reasonably necessary to:
          </p>
          <ul>
            <li>Provide CELPIPBRO features</li>
            <li>Generate AI feedback and estimated scores</li>
            <li>Create transcripts</li>
            <li>Track your progress</li>
            <li>Maintain your practice history</li>
            <li>Provide support</li>
            <li>Secure, debug, and improve the platform</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p className="mt-3">
            You are responsible for the content you submit. You agree not to
            upload or submit content that is unlawful, harmful, abusive,
            defamatory, discriminatory, harassing, sexually explicit, malicious,
            infringing, or otherwise inappropriate.
          </p>
          <p className="mt-3">We do not sell your submitted practice content.</p>
        </Section>

        <Section title="9. Voice Recording and Transcription">
          <p>CELPIPBRO may allow you to record speaking responses.</p>
          <p className="mt-3">
            By using speaking practice, mock test, or audio features, you
            consent to CELPIPBRO collecting, storing, processing, and
            transcribing your voice recordings for the purpose of providing
            practice feedback, estimated scores, progress tracking, and related
            platform features.
          </p>
          <p className="mt-3">
            You should not record or submit another person&rsquo;s voice without
            their permission.
          </p>
        </Section>

        <Section title="10. AI Feedback and Score Estimates">
          <p>
            CELPIPBRO uses AI systems, including{" "}
            <strong className="text-white">OpenAI</strong> services, to generate
            feedback, estimated band scores, corrections, transcripts, and
            sample responses.
          </p>
          <p className="mt-3">You understand and agree that:</p>
          <ul>
            <li>
              AI feedback may be incomplete, inaccurate, inconsistent, or
              incorrect
            </li>
            <li>
              Estimated scores are{" "}
              <strong className="text-white">not</strong> official CELPIP scores
            </li>
            <li>CELPIPBRO does not guarantee any official exam result</li>
            <li>
              CELPIPBRO does not replace a qualified teacher, tutor, language
              assessor, immigration consultant, or legal professional
            </li>
            <li>You should use feedback as practice guidance only</li>
          </ul>
          <p className="mt-3">
            You are responsible for your own study decisions and exam
            preparation.
          </p>
        </Section>

        <Section title="11. Acceptable Use">
          <p>You agree not to:</p>
          <ul>
            <li>Use CELPIPBRO for any unlawful purpose</li>
            <li>Interfere with or disrupt the platform</li>
            <li>
              Attempt to access accounts, systems, data, or features without
              authorization
            </li>
            <li>
              Reverse-engineer, scrape, copy, extract, or misuse prompts,
              scoring logic, AI workflows, source code, or platform content
            </li>
            <li>
              Use bots, scripts, automated tools, or bulk methods without our
              permission
            </li>
            <li>
              Resell, redistribute, sublicense, or commercially exploit
              CELPIPBRO content or access
            </li>
            <li>
              Share paid access, accounts, attempts, credits, or bundles with
              others
            </li>
            <li>Upload malware, harmful code, or malicious files</li>
            <li>Submit offensive, abusive, illegal, or infringing content</li>
            <li>
              Use CELPIPBRO to generate spam, deceptive content, or content
              that violates another person&rsquo;s rights
            </li>
            <li>Attempt to overload, damage, or impair the platform</li>
          </ul>
          <p className="mt-3">
            We may limit, suspend, or terminate access if we believe you have
            violated these Terms or used the platform in a way that creates risk
            for CELPIPBRO, other users, service providers, or the public.
          </p>
        </Section>

        <Section title="12. Intellectual Property">
          <p>
            CELPIPBRO and its content, design, features, software, prompts,
            rubrics, scoring workflows, brand elements, text, graphics,
            interface, and learning materials are owned by CELPIPBRO or its
            licensors and are protected by copyright, trademark, and other laws.
          </p>
          <p className="mt-3">
            Subject to these Terms, CELPIPBRO grants you a limited, personal,
            non-exclusive, non-transferable, revocable license to use the
            platform for your own personal CELPIP practice.
          </p>
          <p className="mt-3">
            You may not copy, reproduce, modify, distribute, sell, lease,
            sublicense, publicly display, publicly perform, or create derivative
            works from CELPIPBRO content or platform features unless we give
            written permission.
          </p>
        </Section>

        <Section title="13. Third-Party Services">
          <p>CELPIPBRO uses third-party services, including:</p>
          <ul>
            <li>
              <strong className="text-white">Clerk</strong> — account
              authentication and user management
            </li>
            <li>
              <strong className="text-white">OpenAI</strong> — AI processing
              and feedback generation
            </li>
            <li>
              <strong className="text-white">Stripe</strong> — payments
            </li>
            <li>
              <strong className="text-white">Render</strong> — hosting and
              infrastructure
            </li>
          </ul>
          <p className="mt-3">
            Your use of CELPIPBRO may involve these third-party services.
            Third-party services may have their own terms and privacy policies.
            CELPIPBRO is not responsible for the actions, availability,
            policies, or content of third-party services, except where required
            by applicable law.
          </p>
        </Section>

        <Section title="14. Privacy">
          <p>
            Your use of CELPIPBRO is also governed by our{" "}
            <Link
              href="/privacy"
              className="text-amber-400 underline hover:text-amber-300 transition-colors"
            >
              Privacy Policy
            </Link>
            , which explains how we collect, use, store, share, and protect
            personal information.
          </p>
          <p className="mt-3">
            By using CELPIPBRO, you agree to our Privacy Policy.
          </p>
        </Section>

        <Section title="15. Service Availability and Changes">
          <p>
            We aim to provide a reliable platform, but CELPIPBRO may be
            interrupted, delayed, unavailable, or changed from time to time.
          </p>
          <p className="mt-3">
            We may modify, suspend, or discontinue any feature, plan, tool,
            content, or service at any time, including for maintenance,
            security, legal, technical, business, or abuse-prevention reasons.
          </p>
          <p className="mt-3">
            We are not liable for temporary unavailability, data delays, model
            errors, service interruptions, or third-party service outages,
            except where liability cannot be excluded under applicable law.
          </p>
        </Section>

        <Section title="16. Account Suspension or Termination">
          <p>
            We may suspend, restrict, or terminate your account or access to
            CELPIPBRO if:
          </p>
          <ul>
            <li>You violate these Terms</li>
            <li>Your payment is reversed, disputed, fraudulent, or unpaid</li>
            <li>
              Your use creates security, legal, technical, abuse, or
              reputational risk
            </li>
            <li>We are required to do so by law</li>
            <li>We discontinue the platform or a feature</li>
            <li>
              We detect account sharing, misuse, scraping, automation, or
              unauthorized access
            </li>
          </ul>
          <p className="mt-3">
            You may stop using CELPIPBRO at any time. You may delete your
            account where account deletion is available, or contact us for
            assistance.
          </p>
          <p className="mt-3">
            After termination, your right to use CELPIPBRO ends immediately.
            Sections that by their nature should survive termination will
            continue to apply, including payment obligations, intellectual
            property, disclaimers, limitation of liability, privacy-related
            obligations, and dispute provisions.
          </p>
        </Section>

        <Section title="17. Disclaimer of Warranties">
          <p>
            CELPIPBRO is provided on an{" "}
            <strong className="text-white">
              &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
            </strong>{" "}
            basis.
          </p>
          <p className="mt-3">
            To the fullest extent permitted by law, we disclaim all warranties,
            whether express, implied, statutory, or otherwise, including
            warranties of merchantability, fitness for a particular purpose,
            accuracy, reliability, availability, non-infringement, and
            uninterrupted operation.
          </p>
          <p className="mt-3">We do not warrant that:</p>
          <ul>
            <li>CELPIPBRO will always be available or error-free</li>
            <li>AI feedback will always be accurate or complete</li>
            <li>Estimated scores will match official CELPIP results</li>
            <li>The platform will meet your expectations</li>
            <li>Bugs, errors, or interruptions will be corrected immediately</li>
            <li>The platform will be free of harmful components</li>
          </ul>
          <p className="mt-3">
            Some jurisdictions do not allow certain warranty exclusions, so some
            of the above exclusions may not apply to you.
          </p>
        </Section>

        <Section title="18. Limitation of Liability">
          <p>
            To the fullest extent permitted by applicable law, CELPIPBRO and
            its operator will not be liable for indirect, incidental, special,
            consequential, exemplary, or punitive damages, including loss of
            profits, loss of data, loss of opportunity, loss of goodwill, exam
            failure, immigration consequences, business interruption, or
            reputational harm.
          </p>
          <p className="mt-3">
            To the fullest extent permitted by law, CELPIPBRO&rsquo;s total
            liability for any claim related to the platform or these Terms will
            not exceed the amount you paid to CELPIPBRO in the three months
            before the event giving rise to the claim, or{" "}
            <strong className="text-white">CAD $50</strong> if you did not pay
            anything.
          </p>
          <p className="mt-3">
            Nothing in these Terms limits liability that cannot legally be
            limited or excluded.
          </p>
        </Section>

        <Section title="19. Indemnity">
          <p>
            You agree to defend, indemnify, and hold harmless CELPIPBRO and its
            operator from and against claims, damages, losses, liabilities,
            costs, and expenses arising from:
          </p>
          <ul>
            <li>Your use or misuse of CELPIPBRO</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any law or third-party rights</li>
            <li>Content you submit to the platform</li>
            <li>
              Your unauthorized use of another person&rsquo;s information,
              account, voice, or content
            </li>
          </ul>
          <p className="mt-3">
            This section applies to the extent permitted by applicable law.
          </p>
        </Section>

        <Section title="20. Governing Law">
          <p>
            These Terms are governed by the laws of the{" "}
            <strong className="text-white">Province of Quebec</strong> and the
            applicable laws of Canada, without regard to conflict of law
            principles.
          </p>
          <p className="mt-3">
            Any disputes will be handled in the courts located in Quebec,
            Canada, unless applicable consumer protection laws require a
            different forum.
          </p>
        </Section>

        <Section title="21. Consumer Protection Rights">
          <p>
            Nothing in these Terms is intended to limit rights you may have
            under applicable consumer protection, privacy, or other mandatory
            laws.
          </p>
          <p className="mt-3">
            If any part of these Terms is found to be invalid or unenforceable,
            the remaining parts will continue to apply.
          </p>
        </Section>

        <Section title="22. Changes to These Terms">
          <p>We may update these Terms from time to time.</p>
          <p className="mt-3">
            When we make changes, we will update the &ldquo;Last updated&rdquo;
            date at the top of this page. If changes are material, we may
            provide additional notice, such as through the platform or by email.
          </p>
          <p className="mt-3">
            Your continued use of CELPIPBRO after updated Terms are posted means
            you accept the updated Terms.
          </p>
        </Section>

        <Section title="23. Contact Us">
          <p>If you have questions about these Terms, contact us at:</p>
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
            <Link href="/terms" className="hover:text-amber-400 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-amber-400 transition-colors">
              Privacy Policy
            </Link>
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
