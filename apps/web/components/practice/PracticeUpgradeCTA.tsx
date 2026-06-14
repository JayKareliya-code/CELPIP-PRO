// ─────────────────────────────────────────────────────────────────────────────
// PracticeUpgradeCTA — Upgrade prompt shown when user is below the Ultra limit.
//
// Colour is skill-aware: indigo for speaking (matches SpeakingModuleHome
// banner), emerald for writing (matches WritingModuleHome banner).
// ─────────────────────────────────────────────────────────────────────────────

import Link          from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { cn }        from "@/lib/utils";
import type { Skill } from "@/lib/types";

interface PracticeUpgradeCTAProps {
  skill:    Skill;
  compact?: boolean;
}

const COPY: Record<Skill, { heading: string; body: string }> = {
  speaking: {
    heading: "Want more speaking practice tests?",
    body:    "Purchase a Mock Test Bundle or upgrade to Pro to unlock more full-length speaking sessions.",
  },
  writing: {
    heading: "Want more writing practice tests?",
    body:    "Purchase a Mock Test Bundle or upgrade to Pro to unlock more full-length writing sessions.",
  },
};

const COLORS: Record<Skill, {
  border: string; bg: string; iconBg: string; iconBorder: string;
  iconText: string; heading: string; body: string; btn: string;
}> = {
  speaking: {
    border:      "border-border",
    bg:          "bg-surface",
    iconBg:      "bg-primary/10",
    iconBorder:  "border-primary/20",
    iconText:    "text-primary",
    heading:     "text-foreground",
    body:        "text-subtle",
    btn:         "bg-primary hover:bg-primary-hover",
  },
  writing: {
    border:      "border-border",
    bg:          "bg-surface",
    iconBg:      "bg-primary/10",
    iconBorder:  "border-primary/20",
    iconText:    "text-primary",
    heading:     "text-foreground",
    body:        "text-subtle",
    btn:         "bg-primary hover:bg-primary-hover",
  },
};

export function PracticeUpgradeCTA({ skill, compact = false }: PracticeUpgradeCTAProps) {
  const { heading, body } = COPY[skill];
  const c = COLORS[skill];

  if (compact) {
    return (
      <p className="text-xs text-subtle">
        <Link
          href="/billing"
          className={cn("underline underline-offset-2 transition-colors", c.iconText, "hover:opacity-80")}
        >
          Upgrade your plan
        </Link>{" "}
        to unlock more practice tests.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 flex items-center gap-4 flex-wrap",
        c.border, c.bg,
      )}
    >
      <div className={cn("w-9 h-9 rounded-lg border flex items-center justify-center shrink-0", c.iconBg, c.iconBorder)}>
        <Sparkles className={cn("w-4 h-4", c.iconText)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold", c.heading)}>{heading}</p>
        <p className={cn("text-xs mt-0.5", c.body)}>{body}</p>
      </div>
      <Link
        href="/billing"
        className={cn(
          "shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors",
          c.btn,
        )}
      >
        Upgrade
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
