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

const LAST_UPDATED = "May 14, 2026";
const EFFECTIVE_DATE = "May 14, 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0D0F17] text-white">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-amber-500/10 blur-[120px]" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30 mb-6">
            <Lock className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-3">
            Privacy Policy
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
            This Privacy Policy explains how{" "}
            <strong className="text-white">CELPIPBRO</strong> collects, uses,
            stores, shares, and protects personal information when you use our
            website, application, practice tools, mock tests, account features,
            payment features, and related services.
          </p>
          <p className="text-sm text-white/70 leading-relaxed">
            CELPIPBRO is operated by an independent solo entrepreneur based in
            Quebec, Canada. In this Privacy Policy,{" "}
            <strong className="text-white">
              &ldquo;CELPIPBRO,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo;
            </strong>{" "}
            and{" "}
            <strong className="text-white">&ldquo;our&rdquo;</strong> refer to
            CELPIPBRO and the person operating the platform.
          </p>
          <p className="text-sm text-white/70 leading-relaxed">
            CELPIPBRO is an independent CELPIP practice platform. It is not
            affiliated with, endorsed by, sponsored by, or officially connected
            to Paragon Testing Enterprises, Prometric Canada, or any official
            CELPIP test administrator.
          </p>
          <p className="text-sm text-white/70 leading-relaxed">
            By using CELPIPBRO, you agree to the collection, use, and disclosure
            of your personal information as described in this Privacy Policy.
          </p>
        </div>

        {/* ── Sections ── */}

        <Section title="1. Privacy Contact">
          <p>
            The person responsible for privacy matters at CELPIPBRO can be
            contacted at:
          </p>
          <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-sm text-white/70">
            <p className="font-semibold text-white">
              CELPIPBRO Privacy Officer
            </p>
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
          <p className="mt-3">
            You may contact us to ask questions about this Privacy Policy,
            request access to your personal information, request correction or
            deletion, withdraw consent where applicable, or make a privacy
            complaint.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>
            We collect only the information reasonably necessary to provide and
            improve CELPIPBRO, process purchases, secure the platform, and
            communicate with users.
          </p>

          <SubHeading>2.1 Account Information</SubHeading>
          <p>
            When you create or use an account, we may collect information such
            as:
          </p>
          <ul>
            <li>Name</li>
            <li>Email address</li>
            <li>User ID or account ID</li>
            <li>Login and authentication information</li>
            <li>Account status</li>
            <li>Account settings and preferences</li>
          </ul>
          <p className="mt-3">
            Account registration, login, authentication, and user management are
            handled through <strong className="text-white">Clerk</strong>.
          </p>

          <SubHeading>2.2 Practice Content</SubHeading>
          <p>
            When you use CELPIPBRO practice tools, we may collect and store:
          </p>
          <ul>
            <li>Writing responses</li>
            <li>Speaking responses</li>
            <li>Voice recordings</li>
            <li>Generated transcripts</li>
            <li>Mock test answers</li>
            <li>AI-generated feedback</li>
            <li>Estimated CELPIP band scores</li>
            <li>Improved sample responses</li>
            <li>Vocabulary, grammar, fluency, and structure feedback</li>
            <li>Practice history and progress data</li>
          </ul>

          <SubHeading>2.3 Voice Recordings and Transcripts</SubHeading>
          <p>
            When you use speaking practice, speaking mock tests, or other
            audio-based features, we may collect and store both your original
            voice recording and a generated transcript of the recording.
          </p>
          <p className="mt-3">
            We use recordings and transcripts to generate AI-based feedback,
            estimated scores, fluency comments, and practice history.
          </p>

          <SubHeading>2.4 Payment Information</SubHeading>
          <p>
            Payments are processed by{" "}
            <strong className="text-white">Stripe</strong>. We may collect or
            receive limited payment-related information, such as:
          </p>
          <ul>
            <li>Stripe customer ID</li>
            <li>Payment status</li>
            <li>Purchase history</li>
            <li>Plan or bundle purchased</li>
            <li>Invoice or receipt information</li>
            <li>Billing email</li>
            <li>Fraud prevention or payment verification information</li>
          </ul>
          <p className="mt-3">
            We do <strong className="text-white">not</strong> store full credit
            card numbers on CELPIPBRO servers. Full payment card details are
            handled by Stripe.
          </p>

          <SubHeading>2.5 Technical and Security Information</SubHeading>
          <p>When you use CELPIPBRO, we may collect technical information such as:</p>
          <ul>
            <li>IP address</li>
            <li>Browser type</li>
            <li>Device type</li>
            <li>Operating system</li>
            <li>Pages or features accessed</li>
            <li>Date and time of access</li>
            <li>Error logs</li>
            <li>Security logs</li>
            <li>General usage information needed to maintain and protect the platform</li>
          </ul>

          <SubHeading>2.6 Communications</SubHeading>
          <p>If you contact us, we may collect:</p>
          <ul>
            <li>Your name</li>
            <li>Your email address</li>
            <li>The content of your message</li>
            <li>Support request history</li>
            <li>Any attachments or information you voluntarily provide</li>
          </ul>

          <SubHeading>2.7 Marketing Preferences</SubHeading>
          <p>
            If you subscribe to marketing emails or agree to receive promotional
            communications, we may collect your email address, consent status,
            email preferences, and unsubscribe status.
          </p>
        </Section>

        <Section title="3. How We Use Personal Information">
          <p>We use personal information for the following purposes:</p>
          <ul>
            <li>To create and manage user accounts</li>
            <li>To authenticate users and protect accounts</li>
            <li>To provide CELPIP practice features</li>
            <li>
              To record, transcribe, evaluate, and store speaking practice
              attempts
            </li>
            <li>To evaluate writing responses</li>
            <li>
              To generate AI-based feedback, estimated scores, and improved
              sample answers
            </li>
            <li>To track user progress and practice history</li>
            <li>
              To process payments, purchases, and access to paid features
            </li>
            <li>To provide customer support</li>
            <li>
              To send service-related emails such as account, purchase,
              security, and platform notices
            </li>
            <li>
              To send marketing emails where permitted by law and where consent
              has been obtained or is otherwise legally permitted
            </li>
            <li>
              To detect, prevent, and investigate fraud, abuse, security issues,
              or technical problems
            </li>
            <li>
              To maintain, debug, improve, and develop CELPIPBRO
            </li>
            <li>
              To comply with legal, accounting, tax, and regulatory obligations
            </li>
          </ul>
          <p className="mt-3">
            We do <strong className="text-white">not</strong> sell your personal
            information.
          </p>
        </Section>

        <Section title="4. AI Processing">
          <p>
            CELPIPBRO uses artificial intelligence to provide scoring estimates,
            feedback, corrections, transcripts, practice suggestions, and sample
            responses.
          </p>
          <p className="mt-3">
            Your writing responses, voice recordings, transcripts, and related
            practice content may be processed using{" "}
            <strong className="text-white">OpenAI</strong> services. This
            processing is necessary to provide the AI-powered features of
            CELPIPBRO.
          </p>
          <p className="mt-3">
            AI-generated feedback and estimated scores are provided for
            educational and practice purposes only. They are not official CELPIP
            results and do not guarantee any future exam performance.
          </p>
          <p className="mt-3">
            CELPIPBRO does not use AI feedback to make legal, immigration,
            employment, credit, or similarly significant decisions about users.
            The platform is a practice and learning tool.
          </p>
        </Section>

        <Section title="5. Third-Party Service Providers">
          <p>
            We use third-party service providers to operate CELPIPBRO. These
            providers may process personal information only as needed to provide
            services to us.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-sm text-white/60">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                  <th className="px-4 py-3 text-left font-semibold text-white/80">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">
                    Purpose
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {[
                  ["Clerk", "Account registration, authentication, login, and user management"],
                  ["OpenAI", "AI feedback, scoring estimates, transcription, corrections, and sample responses"],
                  ["Stripe", "Payment processing, invoices, receipts, fraud prevention, and payment records"],
                  ["Amazon S3", "Secure storage of voice recordings and related audio files"],
                  ["Render", "Hosting, application infrastructure, backend services, and technical operations"],
                ].map(([provider, purpose]) => (
                  <tr key={provider}>
                    <td className="px-4 py-3 font-medium text-white/80 whitespace-nowrap">
                      {provider}
                    </td>
                    <td className="px-4 py-3">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4">
            We may add, remove, or change service providers as CELPIPBRO
            develops. If a change materially affects how we handle personal
            information, we will update this Privacy Policy.
          </p>
        </Section>

        <Section title="6. Storage and Processing Outside Quebec or Canada">
          <p>
            Some of our service providers may process or store personal
            information outside Quebec or outside Canada.
          </p>
          <p className="mt-3">
            When personal information is processed outside Quebec or Canada, it
            may be subject to the laws of the jurisdiction where it is
            processed. We use service providers that help us operate CELPIPBRO
            securely, and we share personal information only as reasonably
            necessary for the purposes described in this Privacy Policy.
          </p>
        </Section>

        <Section title="7. Payments and Stripe">
          <p>
            All payments are processed through{" "}
            <strong className="text-white">Stripe</strong>. When you make a
            purchase, Stripe may collect and process payment details, billing
            information, transaction information, and fraud prevention
            information.
          </p>
          <p className="mt-3">
            CELPIPBRO receives limited payment-related information from Stripe
            so we can confirm purchases, activate paid features, provide
            receipts, manage account access, and maintain business records.
          </p>
          <p className="mt-3">
            Your use of Stripe may also be subject to Stripe&rsquo;s own
            privacy policy and terms.
          </p>
        </Section>

        <Section title="8. Account Management and Clerk">
          <p>
            CELPIPBRO uses <strong className="text-white">Clerk</strong> to
            manage user accounts, authentication, and login security.
          </p>
          <p className="mt-3">
            When you create or access your CELPIPBRO account, Clerk may process
            information such as your email address, authentication identifiers,
            login events, session information, and security-related data.
          </p>
          <p className="mt-3">
            If you request account deletion, we will take reasonable steps to
            delete or anonymize personal information associated with your
            account, except where we need to retain information for legal, tax,
            accounting, security, fraud prevention, payment, dispute, or
            legitimate business record purposes.
          </p>
        </Section>

        <Section title="9. Cookies and Similar Technologies">
          <p>
            CELPIPBRO may use cookies or similar technologies that are necessary
            for:
          </p>
          <ul>
            <li>Account login and authentication</li>
            <li>Security</li>
            <li>Session management</li>
            <li>Payment-related functionality</li>
            <li>Remembering basic user preferences</li>
            <li>Maintaining platform functionality</li>
          </ul>
          <p className="mt-3">
            At this time, CELPIPBRO does not use third-party analytics tools
            such as Google Analytics, PostHog, Meta Pixel, or Microsoft
            Clarity.
          </p>
          <p className="mt-3">
            If we add analytics, advertising, tracking, or profiling
            technologies in the future, we will update this Privacy Policy and,
            where required, provide appropriate notice or consent options.
          </p>
        </Section>

        <Section title="10. Marketing Emails">
          <p>
            We may send you service-related emails about your account,
            purchases, security, support requests, or important platform
            updates.
          </p>
          <p className="mt-3">
            We may also send marketing emails about CELPIPBRO features,
            promotions, updates, learning materials, or offers where permitted
            by law. You can unsubscribe from marketing emails at any time by
            using the unsubscribe link in the email or by contacting us at{" "}
            <a
              href="mailto:support@celpipbro.ca"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              support@celpipbro.ca
            </a>
            .
          </p>
          <p className="mt-3">
            Unsubscribing from marketing emails does not stop important
            service-related emails, such as account, payment, security, or
            legal notices.
          </p>
        </Section>

        <Section title="11. When We Share Personal Information">
          <p>
            We may share personal information in the following limited
            situations:
          </p>
          <ul>
            <li>
              With service providers that help us operate CELPIPBRO, including
              Clerk, OpenAI, Stripe, Amazon S3, and Render
            </li>
            <li>To process payments and manage paid access</li>
            <li>
              To provide AI feedback, scoring estimates, transcription, and
              related learning features
            </li>
            <li>
              To comply with legal obligations, court orders, regulatory
              requests, tax obligations, or lawful government requests
            </li>
            <li>
              To protect CELPIPBRO, users, or others from fraud, abuse,
              security threats, or unlawful activity
            </li>
            <li>
              In connection with a future business transfer, restructuring,
              sale, merger, or similar transaction, if applicable
            </li>
          </ul>
          <p className="mt-3">
            We do <strong className="text-white">not</strong> sell your personal
            information.
          </p>
        </Section>

        <Section title="12. Data Retention">
          <p>
            We keep personal information only as long as reasonably necessary
            for the purposes described in this Privacy Policy, unless a longer
            retention period is required or permitted by law.
          </p>
          <p className="mt-3">In general:</p>
          <ul>
            <li>Account information is kept while your account is active</li>
            <li>
              Practice responses, recordings, transcripts, AI feedback,
              estimated scores, and progress history are kept so you can review
              your practice history and continue learning
            </li>
            <li>
              Payment records may be kept for tax, accounting, fraud
              prevention, dispute resolution, and legal purposes
            </li>
            <li>
              Support communications may be kept for customer service and
              recordkeeping
            </li>
            <li>
              Security and technical logs may be kept for a limited period to
              protect and maintain the platform
            </li>
          </ul>
          <p className="mt-3">
            When personal information is no longer needed, we will delete,
            anonymize, or securely dispose of it where reasonably possible.
          </p>
        </Section>

        <Section title="13. User Rights">
          <p>
            Under Quebec&rsquo;s Act respecting the protection of personal
            information in the private sector (Law 25) and other applicable
            Canadian privacy laws, you may have rights regarding your personal
            information, including the right to:
          </p>
          <ul>
            <li>
              Request access to personal information we hold about you
            </li>
            <li>
              Request correction of inaccurate or incomplete information
            </li>
            <li>
              Request deletion of personal information, where legally and
              technically possible
            </li>
            <li>
              Withdraw consent where processing is based on consent
            </li>
            <li>Ask questions about how your information is used</li>
            <li>
              Ask about AI-based processing and the information used to generate
              feedback
            </li>
            <li>Make a privacy complaint</li>
          </ul>
          <p className="mt-3">
            To make a request, contact us at{" "}
            <a
              href="mailto:support@celpipbro.ca"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              support@celpipbro.ca
            </a>
            .
          </p>
          <p className="mt-3">
            We may need to verify your identity before responding to a request.
            Some requests may be limited by legal, security, technical, tax,
            accounting, payment, fraud prevention, or dispute-resolution
            requirements.
          </p>
        </Section>

        <Section title="14. Account Deletion">
          <p>
            If account deletion is available in your account settings, you may
            delete your account directly through the platform.
          </p>
          <p className="mt-3">
            You may also contact us at{" "}
            <a
              href="mailto:support@celpipbro.ca"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              support@celpipbro.ca
            </a>{" "}
            to request deletion.
          </p>
          <p className="mt-3">
            When an account is deleted, we will take reasonable steps to delete
            or anonymize personal information associated with the account,
            including practice content, recordings, transcripts, and progress
            history, unless we need to retain certain information for legal,
            tax, accounting, payment, fraud prevention, security, or
            dispute-resolution purposes.
          </p>
          <p className="mt-3">
            Account deletion may not immediately remove information from
            encrypted backups or logs, but such information will be deleted or
            overwritten according to our normal backup and retention processes.
          </p>
        </Section>

        <Section title="15. Security">
          <p>
            We use reasonable administrative, technical, and organizational
            safeguards to protect personal information. These safeguards may
            include:
          </p>
          <ul>
            <li>Account authentication through Clerk</li>
            <li>Access controls</li>
            <li>Secure payment processing through Stripe</li>
            <li>Secure audio file storage through Amazon S3</li>
            <li>Hosting infrastructure through Render</li>
            <li>Reasonable technical and organizational security measures</li>
            <li>Limited access to user information where possible</li>
            <li>Monitoring for errors, abuse, and security risks</li>
          </ul>
          <p className="mt-3">
            However, no website, application, or online service can guarantee
            absolute security. You are responsible for keeping your login
            credentials secure and for notifying us if you believe your account
            has been compromised.
          </p>
        </Section>

        <Section title="16. Confidentiality Incidents">
          <p>
            If we become aware of a confidentiality incident involving personal
            information, we will take reasonable steps to reduce the risk of
            harm, investigate the incident, and notify affected users and/or
            regulators where required by applicable law, including Quebec&rsquo;s
            Law 25.
          </p>
        </Section>

        <Section title="17. Children and Minors">
          <p>
            CELPIPBRO is intended for users who are at least{" "}
            <strong className="text-white">14 years old</strong>.
          </p>
          <p className="mt-3">
            If you are under 14, you must not use CELPIPBRO unless your parent
            or legal guardian has provided consent where required by law.
          </p>
          <p className="mt-3">
            If we learn that we have collected personal information from a minor
            in a way that is not permitted by law, we will take reasonable steps
            to delete the information or obtain appropriate consent.
          </p>
        </Section>

        <Section title="18. International Users">
          <p>
            CELPIPBRO is operated from Quebec, Canada. If you access CELPIPBRO
            from outside Canada, you understand that your personal information
            may be processed in Canada and in other jurisdictions where our
            service providers operate.
          </p>
        </Section>

        <Section title="19. Changes to This Privacy Policy">
          <p>We may update this Privacy Policy from time to time.</p>
          <p className="mt-3">
            When we make changes, we will update the &ldquo;Last updated&rdquo;
            date at the top of this page. If changes are material, we may
            provide additional notice, such as by email or through the platform.
          </p>
          <p className="mt-3">
            Your continued use of CELPIPBRO after changes are posted means you
            accept the updated Privacy Policy.
          </p>
        </Section>

        <Section title="20. Contact Us">
          <p>
            If you have questions, requests, or complaints about this Privacy
            Policy or our handling of personal information, contact us at:
          </p>
          <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-sm text-white/70">
            <p className="font-semibold text-white">
              CELPIPBRO Privacy Officer
            </p>
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
