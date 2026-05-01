"use client";

import Link from "next/link";
import { Mic, PenLine, X, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PLAN_PRICING, PRO_PLAN_LIMITS, ROUTES } from "@/lib/constants";
import type { Skill } from "@/lib/types";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  skill: Skill;
}

const SKILL_COPY: Record<Skill, { noun: string; Icon: typeof Mic }> = {
  speaking: { noun: "speaking practice", Icon: Mic },
  writing: { noun: "writing practice", Icon: PenLine },
};

export function PaywallModal({ open, onClose, skill }: PaywallModalProps) {
  const { noun, Icon } = SKILL_COPY[skill];
  const practiceLimit =
    skill === "speaking"
      ? `${8 * PRO_PLAN_LIMITS.speaking_attempts_per_task} focused Speaking practices`
      : `${2 * PRO_PLAN_LIMITS.writing_attempts_per_task} focused Writing practices`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1 rounded text-subtle hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <DialogHeader className="text-center items-center gap-2 pt-2">
          <span className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
          </span>
          <DialogTitle className="text-xl">
            You&apos;ve used your free {noun}
          </DialogTitle>
          <DialogDescription className="text-center">
            Pro is the paid plan available now. Upgrade to continue practising
            and get detailed AI feedback on every Pro attempt.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted">
            <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {PLAN_PRICING.pro.name} - {PLAN_PRICING.pro.priceLabel} CAD
              </p>
              <p className="text-xs text-subtle mt-0.5">
                {practiceLimit} - detailed feedback - {PLAN_PRICING.pro.priceNote}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-warning/25 bg-warning/5">
            <p className="text-xs font-semibold text-warning">Ultra is coming soon</p>
            <p className="text-xs text-subtle mt-1">
              Advanced analytics and deeper rewrite drills are planned, but
              checkout is not available yet.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={ROUTES.billing}
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-colors duration-150 shadow-sm hover:shadow-panel"
          >
            <Zap className="w-4 h-4" />
            View Pro Plan
          </Link>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-subtle hover:text-foreground rounded-xl border border-border hover:bg-muted transition-colors"
          >
            Not now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
