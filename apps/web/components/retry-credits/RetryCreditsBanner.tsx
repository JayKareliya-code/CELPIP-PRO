"use client";

// ─────────────────────────────────────────────────────────────────────────────
// RetryCreditsBanner.tsx — Module-home banner showing retry pool as a bar.
//
// Layout: single horizontal row.
//   ┌─────────────────────────────────────────────────────────────────────┐
//   │ ↻ RETRY CREDITS  ████████████████████████░░░░░░░░░░░   39/40        │
//   └─────────────────────────────────────────────────────────────────────┘
//
// Bar fills with REMAINING credits (full = plenty left, empty = none).
// "39/40" reads as remaining / lifetime.
//
// Three states:
//   1. Free plan, never granted → label + empty bar + "0" (purely informational —
//      the upsell cards next to the banner handle the purchase narrative since
//      packs are primarily about extra questions, not retry credits)
//   2. Has credits (>= 1)        → label + bar + count
//   3. Had credits, now 0        → label + empty bar + count + "Buy a pack" CTA
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { RotateCcw, ArrowRight } from "lucide-react";
import { useQuota } from "@/lib/hooks/useQuota";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export function RetryCreditsBanner() {
  const { user }  = useCurrentUser();
  // Retry credits are a single shared pool — the projection skill is arbitrary.
  const quota     = useQuota("speaking");
  const balance   = quota.retry_credits_balance ?? 0;
  const lifetime  = quota.retry_credits_lifetime_granted ?? 0;
  const plan      = user?.plan ?? "starter";
  const isLoading = quota.isLoading;

  if (isLoading) {
    return (
      <div className="h-[56px] rounded-2xl border border-white/[0.07] bg-white/[0.02] animate-pulse" />
    );
  }

  // Shared label — used in all three states so the row signature is consistent.
  const Label = (
    <div className="flex items-center gap-2 shrink-0">
      <RotateCcw className="h-3.5 w-3.5 text-primary/75" />
      <span className="text-xs font-bold uppercase tracking-wider text-white/70">
        Retry credits
      </span>
    </div>
  );

  // ── State 1: free plan, never granted any credits ───────────────────────
  // Purely informational — no CTA. Add-on packs (advertised by the upsell
  // cards next to this banner) are sold as "extra questions" with retry
  // credits as a side-effect, so we don't promote "buy retry credits" here.
  if (plan !== "pro" && lifetime <= 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-5 py-3.5 flex items-center gap-4">
        {Label}
        <div className="flex-1 h-2 rounded-full bg-white/[0.06]" />
        <span className="text-[13px] font-semibold tabular-nums text-white/55 shrink-0 min-w-[3.5rem] text-right">
          0
        </span>
      </div>
    );
  }

  // Bar fills with REMAINING ratio, clamped to [0%, 100%] (0 stays empty so
  // exhausted state reads as truly empty rather than a 2 % sliver).
  const remainingPct = lifetime > 0
    ? Math.max(0, Math.min(100, Math.round((balance / lifetime) * 100)))
    : 0;

  // Bar colour shifts subtly as the pool empties. Stays in the primary
  // family — no alarm-red so the panel reads as informational.
  const barColor =
    remainingPct >= 50 ? "bg-primary"
    : remainingPct >= 20 ? "bg-primary/70"
    : "bg-primary/45";

  // ── State 3: had credits, now exhausted ─────────────────────────────────
  if (balance <= 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-5 py-3.5 flex items-center gap-4">
        {Label}
        <div className="flex-1 h-2 rounded-full bg-white/[0.06]" />
        <span className="text-[13px] font-semibold tabular-nums text-white/85 shrink-0 min-w-[3.5rem] text-right">
          0<span className="text-white/35">/{lifetime}</span>
        </span>
        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shrink-0"
        >
          Buy a pack
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  // ── State 2: has credits — single row: label + bar + count ──────────────
  return (
    <div className="rounded-2xl border border-border bg-surface px-5 py-3.5 flex items-center gap-4">
      {Label}
      <div className="relative flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${remainingPct}%` }}
        />
      </div>
      <span className="text-[13px] font-semibold tabular-nums text-white/85 shrink-0 min-w-[3.5rem] text-right">
        {balance}
        <span className="text-white/35">/{lifetime}</span>
      </span>
    </div>
  );
}
