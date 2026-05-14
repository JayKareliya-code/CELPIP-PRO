"use client";

import { useState } from "react";
import { ChevronDown, Wrench, HelpCircle, Zap, BookOpen } from "lucide-react";
import type { ReportImprovementTip } from "@/lib/types";
import { LockedBlurOverlay } from "./LockedBlurOverlay";

// Priority is index-based — AI already orders tips by importance.
// High = tip 0, Medium = tip 1, Good to Fix = tip 2+
function priorityBadge(index: number, total: number): {
  label: string; text: string; bg: string; border: string;
} {
  if (index === 0)
    return { label: "High Impact",   text: "text-rose-400",  bg: "bg-rose-400/10",   border: "border-rose-400/20" };
  if (index === 1 || index < Math.ceil(total / 2))
    return { label: "Medium",        text: "text-amber-400", bg: "bg-amber-400/10",  border: "border-amber-400/20" };
  return   { label: "Good to Fix",  text: "text-white/35",  bg: "bg-white/[0.04]",  border: "border-white/[0.08]" };
}

interface Props {
  tips:    ReportImprovementTip[];
  locked?: boolean;
}

function TipCard({ tip, index, total, defaultOpen }: {
  tip: ReportImprovementTip;
  index: number;
  total: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasDetail = tip.why || tip.how || tip.example;

  return (
    <div
      className="rounded-xl border border-border bg-white/[0.02] overflow-hidden border-l-2 border-l-amber-500 animate-fade-in"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      {/* Title row */}
      <button
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={[
          "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
          hasDetail ? "hover:bg-white/[0.03] cursor-pointer" : "cursor-default",
        ].join(" ")}
        aria-expanded={open}
        disabled={!hasDetail}
      >
        {/* Number badge */}
        <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold tabular-nums text-amber-400">
          {index + 1}
        </span>

        {/* Priority badge */}
        {(() => {
          const p = priorityBadge(index, total);
          return (
            <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${p.text} ${p.bg} ${p.border}`}>
              {p.label}
            </span>
          );
        })()}

        {/* Title */}
        <span className="flex-1 text-[15px] font-semibold text-white leading-snug">
          {tip.title || tip.why || "Improvement Tip"}
        </span>

        {hasDetail && (
          <ChevronDown
            className={`h-4 w-4 flex-shrink-0 text-white/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Expandable detail */}
      {hasDetail && (
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border/60 flex flex-col divide-y divide-border/40">

              {/* WHY — context row: visible but clearly secondary */}
              {tip.why && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-shrink-0 w-20 pt-0.5">
                    <HelpCircle className="h-3 w-3 text-white/35" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">Why</span>
                  </div>
                  <p className="text-sm leading-relaxed text-white/65">{tip.why}</p>
                </div>
              )}

              {/* HOW — the drill: loudest, most actionable */}
              {tip.how && (
                <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/[0.05]">
                  <div className="flex items-center gap-1.5 flex-shrink-0 w-20 pt-0.5">
                    <Zap className="h-3 w-3 text-amber-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">How</span>
                  </div>
                  <p className="text-[15px] font-semibold leading-relaxed text-white">{tip.how}</p>
                </div>
              )}

              {/* EXAMPLE — BEFORE → AFTER rewrite block */}
              {tip.example && (() => {
                // Parse "BEFORE: ... → AFTER: ..." format
                const arrowIdx = tip.example.indexOf(" → ");
                const hasBefore = tip.example.toUpperCase().startsWith("BEFORE:");
                const hasAfter  = arrowIdx !== -1 && tip.example.toUpperCase().includes("AFTER:");

                if (hasBefore && hasAfter) {
                  const beforeRaw = tip.example.slice(0, arrowIdx).replace(/^BEFORE:\s*/i, "").trim();
                  const afterRaw  = tip.example.slice(arrowIdx + 3).replace(/^AFTER:\s*/i, "").trim();
                  return (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-shrink-0 w-20 pt-0.5">
                        <BookOpen className="h-3 w-3 text-white/50" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Rewrite</span>
                      </div>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        {/* BEFORE */}
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 mt-[3px] text-[9px] font-bold uppercase tracking-widest text-rose-400/70 w-10">Before</span>
                          <p className="text-sm leading-relaxed text-rose-300/80 italic line-through decoration-rose-400/30">{beforeRaw}</p>
                        </div>
                        {/* AFTER */}
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 mt-[3px] text-[9px] font-bold uppercase tracking-widest text-emerald-400/70 w-10">After</span>
                          <p className="text-sm leading-relaxed text-emerald-300 font-medium">{afterRaw}</p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Legacy fallback: render as plain italic
                return (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-shrink-0 w-20 pt-0.5">
                      <BookOpen className="h-3 w-3 text-white/50" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Example</span>
                    </div>
                    <p className="text-sm leading-relaxed text-white/80 italic">{tip.example}</p>
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ImprovementTipsAccordion({ tips, locked }: Props) {
  const [parentOpen, setParentOpen] = useState(true);

  if (!tips.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Parent header — always visible: title + count badge */}
      <button
        onClick={() => setParentOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={parentOpen}
      >
        <div className="flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Coaching Drills
          </span>
          <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
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
            {locked ? (
              /* Locked: show number badges + structure blurred, tip text hidden */
              tips.map((tip, i) => (
                <LockedBlurOverlay key={i} label={`Tip ${i + 1}`} blurPx={4} opacity={0.28}>
                  <TipCard tip={tip} index={i} total={tips.length} defaultOpen={false} />
                </LockedBlurOverlay>
              ))
            ) : (
              tips.map((tip, i) => (
                <TipCard
                  key={i}
                  tip={tip}
                  index={i}
                  total={tips.length}
                  defaultOpen={i === 0}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
