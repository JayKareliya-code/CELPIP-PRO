// ─────────────────────────────────────────────────────────────────────────────
// PaywallModal.tsx — Upgrade prompt shown when a free quota is exceeded
//
// Displayed when a Starter user tries to start a second attempt.
// Links to /billing for the upgrade flow.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import Link         from "next/link";
import { Zap, X }  from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PLAN_PRICING, ROUTES } from "@/lib/constants";
import type { Skill } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface PaywallModalProps {
  /** Controls visibility. */
  open:       boolean;
  /** Called when the user closes or dismisses the modal. */
  onClose:    () => void;
  /** Which module quota was exceeded — changes copy. */
  skill:      Skill;
}

// ── Per-skill copy ─────────────────────────────────────────────────────────────

const SKILL_COPY: Record<Skill, { noun: string; icon: string }> = {
  speaking: { noun: "speaking attempt",  icon: "🎙️" },
  writing:  { noun: "writing submission", icon: "✍️" },
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Paywall modal shown when a free-plan user hits their attempt limit.
 * Surfaces the Pro and Ultra plan prices from constants so pricing copy
 * stays in sync automatically when PLAN_PRICING is updated.
 */
export function PaywallModal({ open, onClose, skill }: PaywallModalProps) {
  const { noun, icon } = SKILL_COPY[skill];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1 rounded text-subtle
                     hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <DialogHeader className="text-center items-center gap-2 pt-2">
          <span className="text-4xl" aria-hidden="true">{icon}</span>
          <DialogTitle className="text-xl">
            You&apos;ve used your free {noun}
          </DialogTitle>
          <DialogDescription className="text-center">
            Upgrade to continue practising and get detailed AI feedback on
            every attempt.
          </DialogDescription>
        </DialogHeader>

        {/* Plan highlights */}
        <div className="mt-2 space-y-3">
          {/* Pro */}
          <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted">
            <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {PLAN_PRICING.pro.name} — {PLAN_PRICING.pro.priceLabel} CAD
              </p>
              <p className="text-xs text-subtle mt-0.5">
                5 attempts per task · Detailed feedback · {PLAN_PRICING.pro.priceNote}
              </p>
            </div>
          </div>

          {/* Ultra */}
          <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
            <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {PLAN_PRICING.ultra.name} — {PLAN_PRICING.ultra.priceLabel} CAD
              </p>
              <p className="text-xs text-subtle mt-0.5">
                15 attempts per task · Advanced analytics · Weak area detection · {PLAN_PRICING.ultra.priceNote}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={ROUTES.billing}
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                       bg-primary hover:bg-primary-hover text-white font-semibold text-sm
                       transition-colors duration-150 shadow-sm hover:shadow-panel"
          >
            <Zap className="w-4 h-4" />
            View Plans &amp; Upgrade
          </Link>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-subtle hover:text-foreground
                       rounded-xl border border-border hover:bg-muted transition-colors"
          >
            Not now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
