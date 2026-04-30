"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SampleResponseCard.tsx — Collapsible high-band sample answer
// Neutral dark card — no indigo tint. Text is white/80 italic.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  sampleResponse: string;
  targetBand?: number | null;
}

export function SampleResponseCard({ sampleResponse, targetBand }: Props) {
  const [open, setOpen] = useState(false);

  if (!sampleResponse) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <span className="text-sm font-semibold uppercase tracking-wider text-white/40">
            {targetBand ? `Band ${targetBand}+ Sample Response` : "High-Band Sample Response"}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-white/30 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-5 py-4">
            <p className="text-sm leading-relaxed text-white/80 italic">
              &ldquo;{sampleResponse}&rdquo;
            </p>
            <p className="mt-3 text-xs text-white/30">
              AI-generated example targeting Band 10+. Use as a model — not a script.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
