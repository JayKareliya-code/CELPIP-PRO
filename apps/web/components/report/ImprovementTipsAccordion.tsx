"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ImprovementTipsAccordion.tsx — Collapsible improvement tips list
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  tips: string[];
}

export function ImprovementTipsAccordion({ tips }: Props) {
  const [open, setOpen] = useState(true);

  if (!tips.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="text-sm font-semibold uppercase tracking-wider text-subtle">
            Improvement Tips
          </span>
          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
            {tips.length}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-subtle transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? `${tips.length * 100}px` : "0px" }}
      >
        <ol className="divide-y divide-border border-t border-border">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-3 px-5 py-3.5 text-sm text-white/80">
              <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="leading-relaxed">{tip}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
