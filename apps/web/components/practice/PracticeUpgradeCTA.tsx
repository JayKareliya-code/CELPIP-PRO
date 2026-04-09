// ─────────────────────────────────────────────────────────────────────────────
// PracticeUpgradeCTA — Upgrade prompt shown when user is below the Ultra limit.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { Skill } from "@/lib/types";

interface PracticeUpgradeCTAProps {
  skill: Skill;
  /** Show compact inline variant (default: false → full card). */
  compact?: boolean;
}

const COPY: Record<Skill, { heading: string; body: string }> = {
  speaking: {
    heading: "Want more speaking practice tests?",
    body:    "Upgrade to Pro (2 tests) or Ultra (5 tests) for more speaking practice.",
  },
  writing: {
    heading: "Want more writing practice tests?",
    body:    "Upgrade to Pro (2 tests) or Ultra (5 tests) for more writing practice.",
  },
};

export function PracticeUpgradeCTA({ skill, compact = false }: PracticeUpgradeCTAProps) {
  const { heading, body } = COPY[skill];

  if (compact) {
    return (
      <p className="text-xs text-subtle">
        <Link href="/billing" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors">
          Upgrade your plan
        </Link>{" "}
        to unlock more practice tests.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-indigo-600/30 bg-indigo-950/20 px-5 py-4 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
        <Sparkles className="w-5 h-5 text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-indigo-200">{heading}</p>
        <p className="text-xs text-indigo-300/60 mt-0.5">{body}</p>
      </div>
      <Link
        href="/billing"
        className="shrink-0 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
      >
        Upgrade
      </Link>
    </div>
  );
}
