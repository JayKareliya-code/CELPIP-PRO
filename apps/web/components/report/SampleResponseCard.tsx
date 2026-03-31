"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SampleResponseCard.tsx — Collapsible high-band sample answer
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  sampleResponse: string;
}

export function SampleResponseCard({ sampleResponse }: Props) {
  const [open, setOpen] = useState(false);

  if (!sampleResponse) return null;

  return (
    <div className="rounded-2xl border border-indigo-500/25 bg-primary/5 shadow-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <span className="text-sm font-semibold uppercase tracking-wider text-subtle">
            Band 10+ Sample Response
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-subtle transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? "600px" : "0px" }}
      >
        <div className="border-t border-indigo-500/20 px-5 py-4">
          <p className="text-sm leading-relaxed text-white/80 italic">
            &ldquo;{sampleResponse}&rdquo;
          </p>
          <p className="mt-3 text-xs text-subtle">
            This is an AI-generated example response targeting Band 10+. Use it as a model — not a script.
          </p>
        </div>
      </div>
    </div>
  );
}
