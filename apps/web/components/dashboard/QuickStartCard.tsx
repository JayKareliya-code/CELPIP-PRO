// ─────────────────────────────────────────────────────────────────────────────
// QuickStartCard.tsx — Speaking & Writing navigation cards
// Pure server component — no interactivity needed.
// ─────────────────────────────────────────────────────────────────────────────

import Link         from "next/link";
import { Mic, PenLine, ArrowRight } from "lucide-react";

const ACTIONS = [
  {
    id:       "quick-start-speaking",
    label:    "Speaking",
    sublabel: "Tasks 1–8 · up to 90 sec",
    href:     "/speaking",
    Icon:     Mic,
  },
  {
    id:       "quick-start-writing",
    label:    "Writing",
    sublabel: "Tasks 1–2 · up to 27 min",
    href:     "/writing",
    Icon:     PenLine,
  },
] as const;

export function QuickStartCard() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ACTIONS.map(({ id, label, sublabel, href, Icon }) => (
        <Link
          key={href}
          id={id}
          href={href}
          className="group flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-3 sm:px-5 sm:py-4 transition-colors hover:border-primary/40"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Icon className="h-4 w-4 text-subtle group-hover:text-primary transition-colors shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{label}</p>
              <p className="text-[10px] sm:text-xs text-subtle mt-0.5 truncate">{sublabel}</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-subtle shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 hidden sm:block" />
        </Link>
      ))}
    </div>
  );
}
