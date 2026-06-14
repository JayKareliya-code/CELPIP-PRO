"use client";

import Link from "next/link";
import {
  Mail,
  MessageSquare,
  ArrowLeft,
  ChevronDown,
  Clock,
  HelpCircle,
  CreditCard,
  ShieldCheck,
  Wrench,
  BookOpen,
} from "lucide-react";
import { useId, useState } from "react";

// ── Static FAQ data ────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "What plans does CELPIPBRO offer?",
    a: "CELPIPBRO offers a free Starter plan and paid one-time purchases — including practice bundles, mock test credits, and add-ons. All purchases are one-time and do not automatically renew. The specific features, limits, and prices are shown at checkout and on the pricing page.",
  },
  {
    q: "Can I get a refund?",
    a: "All purchases are generally final because AI-powered features may be used immediately after purchase. We may consider a refund if a duplicate payment was made, a paid feature was not delivered due to a technical issue on our end, or a billing error occurred. To request a review, contact support@celpipbro.ca.",
  },
  {
    q: "My audio recording isn't working. What should I do?",
    a: "Make sure your browser has microphone permission enabled for CELPIPBRO. Chrome and Edge work best. Safari may require you to allow mic access in System Preferences → Security & Privacy. If the issue persists, email support@celpipbro.ca with your browser and device details.",
  },
  {
    q: "Are the scores I get official CELPIP scores?",
    a: "No. CELPIPBRO is an independent practice platform and is not affiliated with Paragon Testing Enterprises or any official CELPIP test administrator. All scores are AI-estimated for practice purposes only and are not official CELPIP results.",
  },
  {
    q: "How do I delete my account and data?",
    a: "You can delete your account directly from your account settings if the option is available. You may also email support@celpipbro.ca to request deletion. We will take reasonable steps to delete or anonymize your personal information, except where retention is required for legal, tax, or fraud-prevention purposes.",
  },
  {
    q: "I found a bug or the app is broken. How do I report it?",
    a: "Email support@celpipbro.ca with a short description of the issue, your browser and device details, and any screenshots or recordings if possible. We aim to respond within 1–2 business days.",
  },
];

// ── Topic tags ─────────────────────────────────────────────────────────────────

const TOPICS = [
  {
    icon: <CreditCard className="h-3.5 w-3.5" />,
    label: "Billing & Purchases",
    hint: "Include your registered email and order details",
  },
  {
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    label: "Privacy & Data Requests",
    hint: "Access, correction, or deletion under Quebec Law 25",
  },
  {
    icon: <Wrench className="h-3.5 w-3.5" />,
    label: "Technical Issues",
    hint: "Include your browser, device, and a description of the problem",
  },
  {
    icon: <BookOpen className="h-3.5 w-3.5" />,
    label: "General Questions",
    hint: "Platform features, AI feedback, or anything else",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0D0F17] text-white">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-amber-500/10 blur-[120px]" />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30 mb-6">
            <MessageSquare className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-3">
            Contact Us
          </h1>
          <p className="text-white/50 text-sm max-w-sm mx-auto leading-relaxed">
            One inbox for everything — billing, privacy, technical issues, and
            general questions. Check the FAQ below or send us an email.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-12">

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to CELPIPBRO
        </Link>

        {/* ── Main contact block ── */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-8">
          {/* Email CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/70 mb-2">
                Support &amp; Privacy Officer
              </p>
              <a
                href="mailto:support@celpipbro.ca"
                className="group inline-flex items-center gap-2.5 text-2xl font-bold text-white hover:text-amber-400 transition-colors"
                id="contact-email-link"
              >
                <Mail className="h-6 w-6 text-amber-400 shrink-0" />
                support@celpipbro.ca
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-400 text-lg">
                  ↗
                </span>
              </a>
              <p className="mt-2 text-sm text-white/40">
                We typically respond within{" "}
                <strong className="text-white/70">1–2 business days</strong>.
              </p>
            </div>

            {/* Response time badge */}
            <div className="flex items-center gap-2 shrink-0 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-white/50">
              <Clock className="h-4 w-4 text-amber-500/70 shrink-0" />
              <span>
                Mon – Fri<br />
                <strong className="text-white/70">1–2 business days</strong>
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-white/[0.06]" />

          {/* Topic tags */}
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">
            What you can reach us about
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {TOPICS.map((t) => (
              <div
                key={t.label}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 hover:border-white/[0.12] transition-colors"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  {t.icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-white/80">
                    {t.label}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">{t.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <HelpCircle className="h-5 w-5 text-amber-400" />
            <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
          <span>© {new Date().getFullYear()} CELPIPBRO. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-amber-400 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-amber-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/contact" className="hover:text-amber-400 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FAQ accordion ──────────────────────────────────────────────────────────────

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId(); // unique per-instance for the aria-controls link

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden transition-colors hover:border-white/[0.12]">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="text-sm font-medium text-white/80">{question}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 ${
            open ? "rotate-180 text-amber-400" : ""
          }`}
        />
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-label={question}
          className="px-5 pb-4 text-sm text-white/55 leading-relaxed border-t border-white/[0.05] pt-3"
        >
          {answer}
        </div>
      )}
    </div>
  );
}
