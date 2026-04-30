"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ImprovementTipsAccordion.tsx — Collapsible improvement tips list
// Numbered items with amber text accent, no background highlight cards.
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
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="text-sm font-semibold uppercase tracking-wider text-white/40">
            Improvement Tips
          </span>
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
            {tips.length}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-white/30 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/*
        CSS grid-row animation: 0fr → 1fr collapses/expands the inner div to its
        natural height without any JS measurement or pixel-budget guessing.
        This is the correct fix for "maxHeight clipping long tips on mobile".
      */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <ol className="divide-y divide-border border-t border-border">
            {tips.map((tip, i) => (
              <li key={i} className="flex gap-3 px-5 py-3.5 text-sm text-white/75">
                {/* Number accent only — no background pill */}
                <span className="flex-shrink-0 text-xs font-bold text-amber-400 w-5 pt-0.5 tabular-nums">
                  {i + 1}.
                </span>
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
