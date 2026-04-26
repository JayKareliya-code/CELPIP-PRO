"use client";

import Link from "next/link";
import { Mail, MessageSquare, ArrowLeft, ChevronDown, Clock, ShieldCheck, HelpCircle } from "lucide-react";
import { useState } from "react";

// ── Static FAQ data ────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "How do I cancel or change my subscription?",
    a: "Log in and head to Billing → Manage Subscription. You can cancel or change your plan at any time. Access continues until the end of your current billing period.",
  },
  {
    q: "Can I get a refund?",
    a: "All purchases are final by default. If the platform failed to deliver the described service, reach out to support@celpipbro.com within 7 days of purchase and we'll review your case.",
  },
  {
    q: "My audio recording isn't working. What should I do?",
    a: "Make sure your browser has microphone permission enabled for celpipbro.com. Chrome and Edge work best. Safari may require you to allow mic access in System Preferences → Security & Privacy.",
  },
  {
    q: "Are the scores I get official CELPIP scores?",
    a: "No. Scores on CELPIPBRO are AI-estimated for practice purposes only and are not official CELPIP results from Paragon Testing Enterprises.",
  },
  {
    q: "How do I delete my account and data?",
    a: "Email privacy@celpipbro.com with the subject line 'Account Deletion Request' and we will process it within 30 days.",
  },
  {
    q: "I found a bug or the app is broken. How do I report it?",
    a: "Email support@celpipbro.com with a short description of the issue, your browser/device, and any screenshots or screen recordings if possible. We aim to respond within 1–2 business days.",
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
          <h1 className="text-4xl font-black tracking-tight mb-3">Contact Us</h1>
          <p className="text-white/50 text-sm max-w-sm mx-auto leading-relaxed">
            Have a question or need help? We're here for you. Check the FAQ below or send us a message.
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

        {/* Contact cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          <ContactCard
            icon={<Mail className="h-5 w-5 text-amber-400" />}
            title="General Support"
            description="Questions about the platform, billing, or your account."
            email="support@celpipbro.com"
          />
          <ContactCard
            icon={<ShieldCheck className="h-5 w-5 text-amber-400" />}
            title="Privacy & Data"
            description="Data deletion, export requests, or privacy concerns."
            email="privacy@celpipbro.com"
          />
        </div>

        {/* Response time notice */}
        <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 text-sm text-white/55">
          <Clock className="h-4 w-4 shrink-0 mt-0.5 text-amber-500/70" />
          <p>
            We typically respond within <strong className="text-white/80">1–2 business days</strong>.
            For urgent billing issues, please include your registered email address and order details to help us assist you faster.
          </p>
        </div>

        {/* FAQ */}
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
            <Link href="/terms" className="hover:text-amber-400 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-amber-400 transition-colors">Privacy Policy</Link>
            <Link href="/contact" className="hover:text-amber-400 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ContactCard({
  icon,
  title,
  description,
  email,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  email: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:border-amber-500/25 hover:bg-amber-500/[0.04] transition-all duration-200 p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 shrink-0">
          {icon}
        </div>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <p className="text-sm text-white/50 leading-relaxed">{description}</p>
      <a
        href={`mailto:${email}`}
        className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors group"
      >
        <Mail className="h-4 w-4" />
        {email}
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
      </a>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden transition-colors hover:border-white/[0.12]">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-white/80">{question}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 ${
            open ? "rotate-180 text-amber-400" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-white/55 leading-relaxed border-t border-white/[0.05] pt-3">
          {answer}
        </div>
      )}
    </div>
  );
}
