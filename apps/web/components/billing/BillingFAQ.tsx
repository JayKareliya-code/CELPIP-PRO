"use client";

// ─────────────────────────────────────────────────────────────────────────────
// BillingFAQ.tsx — Collapsible FAQ section for the billing page
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Is this really a one-time payment?",
    a: "Yes. There are no subscriptions, no renewals, and no hidden fees. You pay once and your attempts never expire.",
  },
  {
    q: "Can I upgrade from Pro to Ultra later?",
    a: "Absolutely. You can upgrade at any time by selecting the Ultra plan on this page. You'll be charged the full Ultra price and your attempt pool will be increased immediately after payment is confirmed.",
  },
  {
    q: "What happens to my attempts if I upgrade?",
    a: "Your previously used attempts are preserved. Upgrading simply increases the total pool. For example, if you've already used 3 of your 5 Pro attempts on Task 1, you'll have 12 of the 15 Ultra attempts remaining after upgrading.",
  },
  {
    q: "Can I get a refund?",
    a: "Because CELPIPBro delivers instant digital access, all purchases are final. If you have a problem, reach out via the Contact page and we'll do our best to help.",
  },
  {
    q: "Is my payment secure?",
    a: "All payments are processed by Stripe, which is PCI DSS Level 1 certified. CELPIPBro never stores your card details.",
  },
  {
    q: "Do attempts expire?",
    a: "No. Your practice attempts never expire. Use them at your own pace.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left hover:text-primary transition-colors"
      >
        <span className="text-sm font-semibold text-foreground">{q}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-subtle shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <p className="text-sm text-subtle leading-relaxed pb-4 pr-8">{a}</p>
      )}
    </div>
  );
}

export function BillingFAQ() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h3 className="text-base font-bold text-foreground mb-2">Frequently Asked Questions</h3>
      <div className="mt-2">
        {FAQS.map((faq) => (
          <FAQItem key={faq.q} q={faq.q} a={faq.a} />
        ))}
      </div>
    </div>
  );
}
