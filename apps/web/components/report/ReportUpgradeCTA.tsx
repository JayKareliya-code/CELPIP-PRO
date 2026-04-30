"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ReportUpgradeCTA.tsx — Pro upgrade card shown at bottom of Starter report
// ─────────────────────────────────────────────────────────────────────────────

import Link          from "next/link";
import { Check, ArrowRight } from "lucide-react";

const PRO_FEATURES = [
  "Per-dimension rubric scores (Task Completion, Coherence, Vocabulary…)",
  "Detailed strengths & specific areas to improve",
  "Numbered improvement tips tailored to your response",
  "Band-targeted sample response matched to your goal",
  "Full speaking transcript so you can read what you said",
];

export function ReportUpgradeCTA() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-subtle mb-1">
          Unlock Full Report
        </p>
        <h3 className="text-lg font-bold text-foreground">
          You&rsquo;re seeing the Starter summary
        </h3>
        <p className="mt-1 text-sm text-subtle leading-relaxed">
          Pro gives you the complete coaching report — rubric breakdown, feedback
          panels, improvement plan, and a sample response tuned to your target band.
        </p>
      </div>

      <ul className="mb-6 space-y-2.5">
        {PRO_FEATURES.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5 text-sm text-foreground/80">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success/70" />
            {feat}
          </li>
        ))}
      </ul>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t border-border">
        <div>
          <p className="text-sm font-bold text-foreground">Pro Plan — $49.99 CAD</p>
          <p className="text-xs text-subtle">One-time payment · Never expires</p>
        </div>
        <Link
          href="/billing"
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Upgrade to Pro <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
