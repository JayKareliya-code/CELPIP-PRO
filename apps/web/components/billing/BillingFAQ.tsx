"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Is this really a one-time payment?",
    a: "Yes. Pro is a one-time purchase. There are no subscriptions, renewals, or hidden fees.",
  },
  {
    q: "What does Pro unlock?",
    a: "Pro unlocks individual Speaking and Writing task practice, detailed AI feedback, estimated practice band scores, improved sample responses, vocabulary and templates, attempt history, and 2 full mock tests, each covering Speaking and Writing.",
  },
  {
    q: "Are the scores official CELPIP results?",
    a: "No. CELPIPBRO provides AI-generated practice estimates and feedback. Official CELPIP scores only come from the official CELPIP test administrator.",
  },
  {
    q: "Can I get a refund?",
    a: "Because CELPIPBRO delivers instant digital access, all purchases are final. If you have a problem, reach out via the Contact page and we will do our best to help.",
  },
  {
    q: "Is my payment secure?",
    a: "All payments are processed by Stripe, which is PCI DSS Level 1 certified. CELPIPBRO never stores your card details.",
  },
  {
    q: "Do attempts expire?",
    a: "No. Your purchased Pro practice access does not expire. Use it at your own pace.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/[0.08] last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left hover:text-primary transition-colors"
      >
        <span className="text-sm font-medium text-white/75">{q}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-white/40 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <p className="text-sm text-white/55 leading-relaxed pb-4 pr-8">{a}</p>
      )}
    </div>
  );
}

export function BillingFAQ() {
  return (
    <div className="rounded-xl border border-white/[0.08] px-6 py-2">
      <div className="py-4 border-b border-white/[0.08]">
        <h3 className="text-base font-semibold text-white/70">
          Frequently Asked Questions
        </h3>
      </div>
      <div>
        {FAQS.map((faq) => (
          <FAQItem key={faq.q} q={faq.q} a={faq.a} />
        ))}
      </div>
    </div>
  );
}
