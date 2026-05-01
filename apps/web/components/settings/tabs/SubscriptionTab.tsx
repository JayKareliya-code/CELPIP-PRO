"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/settings/tabs/SubscriptionTab.tsx
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { PLAN_PRICING }   from "@/lib/constants";
import { Section }        from "@/components/settings/shared/Section";
import { PlanBadge }      from "@/components/settings/shared/PlanBadge";

const PLAN_DESCRIPTIONS: Record<string, string> = {
  starter: "Free plan — limited to 1 mock test per module.",
  pro:     "Pro plan — 5 attempts per task, detailed AI feedback.",
  ultra:   "Ultra plan — 15 attempts per task, full analytics suite.",
};

export function SubscriptionTab() {
  const { user } = useCurrentUser();
  const plan     = user?.plan ?? "starter";
  const info     = PLAN_PRICING[plan as keyof typeof PLAN_PRICING];

  return (
    <div className="space-y-4">

      {/* ── Current plan ───────────────────────────────────────────────── */}
      <Section title="Your Plan">
        <div className="flex items-start justify-between gap-4">
          <div>
            <PlanBadge plan={plan} />
            <p className="text-sm text-white/40 mt-2">
              {PLAN_DESCRIPTIONS[plan] ?? ""}
            </p>
            {info.price > 0 && (
              <p className="text-xs text-white/30 mt-1">{info.priceNote}</p>
            )}
          </div>

          {plan !== "ultra" && (
            <Link
              href="/billing"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition-colors"
            >
              Upgrade <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </Section>

      {/* ── Billing link ───────────────────────────────────────────────── */}
      <Section
        title="Billing & Invoices"
        description="Review your payment history and manage your billing details."
      >
        <Link
          href="/billing"
          className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/60 hover:text-white/90 hover:border-amber-500/20 hover:bg-amber-500/[0.04] transition-all duration-150"
        >
          <span className="font-medium">View billing &amp; payment history</span>
          <ChevronRight className="w-4 h-4 shrink-0" />
        </Link>
      </Section>
    </div>
  );
}
