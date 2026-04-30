"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ImprovementTipsAccordion.tsx — Coaching drill cards
//
// Each tip is an expandable card showing:
//   • Title (always visible — the label)
//   • Why  — how this gap hurts the band score
//   • How  — the specific practice drill
//   • Example — a concrete before/after phrase
//
// Legacy format (plain string items with empty why/how/example) collapses
// gracefully to show only the title as a numbered item.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ReportImprovementTip } from "@/lib/types";

interface Props {
  tips: ReportImprovementTip[];
}

function TipCard({ tip, index, defaultOpen }: { tip: ReportImprovementTip; index: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasDetail = tip.why || tip.how || tip.example;

  return (
    <div
      className="rounded-xl border border-border bg-surface/60 overflow-hidden animate-fade-in"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      <button
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={[
          "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
          hasDetail ? "hover:bg-white/[0.02] cursor-pointer" : "cursor-default",
        ].join(" ")}
        aria-expanded={open}
        disabled={!hasDetail}
      >
        {/* Number badge */}
        <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-bold tabular-nums text-amber-400">
          {index + 1}
        </span>

        {/* Title */}
        <span className="flex-1 text-sm font-medium text-white/90">
          {tip.title || tip.why || "Improvement Tip"}
        </span>

        {/* Expand chevron */}
        {hasDetail && (
          <ChevronDown
            className={`h-3.5 w-3.5 flex-shrink-0 text-white/25 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Expandable drill content */}
      {hasDetail && (
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border/60 pt-3">

              {/* Why */}
              {tip.why && (
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 text-xs font-bold text-white/25 uppercase tracking-widest w-8 pt-0.5">Why</span>
                  <p className="text-xs leading-relaxed text-white/60">{tip.why}</p>
                </div>
              )}

              {/* How */}
              {tip.how && (
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 text-xs font-bold text-amber-400/70 uppercase tracking-widest w-8 pt-0.5">How</span>
                  <p className="text-xs leading-relaxed text-white/80">{tip.how}</p>
                </div>
              )}

              {/* Example */}
              {tip.example && (
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-1.5">Example</p>
                  <p className="text-xs leading-relaxed text-white/70 italic">{tip.example}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ImprovementTipsAccordion({ tips }: Props) {
  const [parentOpen, setParentOpen] = useState(true);

  if (!tips.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Parent header */}
      <button
        onClick={() => setParentOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={parentOpen}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="text-sm font-semibold uppercase tracking-wider text-white/40">
            Coaching Drills
          </span>
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
            {tips.length}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-white/30 transition-transform duration-200 ${parentOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Collapsible card list */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: parentOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-4 py-4 flex flex-col gap-2.5">
            {tips.map((tip, i) => (
              <TipCard
                key={i}
                tip={tip}
                index={i}
                defaultOpen={i === 0}  // First tip open by default
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
