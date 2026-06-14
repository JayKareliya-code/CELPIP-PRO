"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ImprovementTipsAccordion.tsx — Coaching drill list
//
// Subtle theme-matched styling. Uses the site's amber-gold primary (#C8963E)
// for accents — no bright tints, no colored fills. Priority is conveyed by a
// thin left rule and a single muted dot rather than loud severity pills.
// ─────────────────────────────────────────────────────────────────────────────

import { useId, useState } from "react";
import { ChevronDown, Wrench, HelpCircle, Zap, BookOpen } from "lucide-react";
import type { ReportImprovementTip } from "@/lib/types";
import { LockedBlurOverlay } from "./LockedBlurOverlay";

// ── Priority helpers ──────────────────────────────────────────────────────────
//
// Tips arrive ordered by impact (AI promise). We map index → a quiet priority
// label and a tiny dot colour. The dot is the ONLY hue beyond the amber-gold
// accent — it gives an at-a-glance scan without a loud pill.

type Priority = { label: string; dotClass: string; railClass: string };

function priorityFor(index: number, total: number): Priority {
  if (index === 0)
    return {
      label:     "High impact",
      dotClass:  "bg-primary",                // amber-gold
      railClass: "before:bg-primary/45",
    };
  if (index < Math.ceil(total / 2))
    return {
      label:     "Medium impact",
      dotClass:  "bg-primary/55",
      railClass: "before:bg-primary/20",
    };
  return {
    label:     "Polish",
    dotClass:  "bg-white/25",
    railClass: "before:bg-white/[0.08]",
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  tips:    ReportImprovementTip[];
  locked?: boolean;
}

// ── Tip card ──────────────────────────────────────────────────────────────────

function TipCard({ tip, index, total, defaultOpen }: {
  tip: ReportImprovementTip;
  index: number;
  total: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId         = useId(); // wires button.aria-controls → panel.id
  const hasDetail = Boolean(tip.why || tip.how || tip.example);
  const p = priorityFor(index, total);

  return (
    <div
      className={[
        "relative rounded-xl border border-border bg-white/[0.015] overflow-hidden animate-fade-in",
        // Thin coloured rail on the left, drawn with a ::before
        "before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px]",
        p.railClass,
      ].join(" ")}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      {/* Title row */}
      <button
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={[
          "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
          hasDetail ? "hover:bg-white/[0.025] cursor-pointer" : "cursor-default",
        ].join(" ")}
        aria-expanded={open}
        aria-controls={hasDetail ? panelId : undefined}
        disabled={!hasDetail}
      >
        {/* Number — outline only, no colour fill */}
        <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full border border-white/15 text-[11px] font-bold tabular-nums text-white/55">
          {index + 1}
        </span>

        {/* Title */}
        <span className="flex-1 text-[15px] font-semibold text-white/90 leading-snug">
          {tip.title || tip.why || "Improvement Tip"}
        </span>

        {/* Subtle priority indicator — dot + label, hidden on small screens */}
        <span className="hidden sm:flex flex-shrink-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-white/35">
          <span className={`h-1.5 w-1.5 rounded-full ${p.dotClass}`} />
          {p.label}
        </span>

        {hasDetail && (
          <ChevronDown
            className={`h-4 w-4 flex-shrink-0 text-white/35 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Expandable detail */}
      {hasDetail && (
        <div
          id={panelId}
          role="region"
          aria-label={tip.title || "Improvement details"}
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border/60 flex flex-col">

              {/* WHY — context, secondary tone */}
              {tip.why && (
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <div className="flex items-center gap-1.5 flex-shrink-0 w-20 pt-0.5">
                    <HelpCircle className="h-3 w-3 text-white/30" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">Why</span>
                  </div>
                  <p className="text-sm leading-relaxed text-white/65">{tip.why}</p>
                </div>
              )}

              {/* HOW — the drill: most important, marked by a subtle amber inset */}
              {tip.how && (
                <div className="flex items-start gap-3 px-4 py-3.5 border-t border-border/40 bg-primary/[0.025]">
                  <div className="flex items-center gap-1.5 flex-shrink-0 w-20 pt-0.5">
                    <Zap className="h-3 w-3 text-primary/80" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Drill</span>
                  </div>
                  <p className="text-[14px] leading-relaxed text-white/85">{tip.how}</p>
                </div>
              )}

              {/* EXAMPLE — BEFORE → AFTER rewrite block, muted treatment */}
              {tip.example && (() => {
                const arrowIdx = tip.example.indexOf(" → ");
                const hasBefore = tip.example.toUpperCase().startsWith("BEFORE:");
                const hasAfter  = arrowIdx !== -1 && tip.example.toUpperCase().includes("AFTER:");

                if (hasBefore && hasAfter) {
                  const beforeRaw = tip.example.slice(0, arrowIdx).replace(/^BEFORE:\s*/i, "").trim();
                  const afterRaw  = tip.example.slice(arrowIdx + 3).replace(/^AFTER:\s*/i, "").trim();
                  return (
                    <div className="flex items-start gap-3 px-4 py-3.5 border-t border-border/40">
                      <div className="flex items-center gap-1.5 flex-shrink-0 w-20 pt-0.5">
                        <BookOpen className="h-3 w-3 text-white/30" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">Rewrite</span>
                      </div>
                      <div className="flex flex-col gap-2 min-w-0">
                        {/* BEFORE — strikethrough, muted */}
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 mt-[3px] text-[9px] font-bold uppercase tracking-widest text-white/30 w-12">Before</span>
                          <p className="text-sm leading-relaxed text-white/45 italic line-through decoration-white/15">{beforeRaw}</p>
                        </div>
                        {/* AFTER — full white, with amber accent label */}
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 mt-[3px] text-[9px] font-bold uppercase tracking-widest text-primary/70 w-12">After</span>
                          <p className="text-sm leading-relaxed text-white/90">{afterRaw}</p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Legacy fallback
                return (
                  <div className="flex items-start gap-3 px-4 py-3.5 border-t border-border/40">
                    <div className="flex items-center gap-1.5 flex-shrink-0 w-20 pt-0.5">
                      <BookOpen className="h-3 w-3 text-white/30" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">Example</span>
                    </div>
                    <p className="text-sm leading-relaxed text-white/75 italic">{tip.example}</p>
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

// ── Outer accordion ───────────────────────────────────────────────────────────

export function ImprovementTipsAccordion({ tips, locked }: Props) {
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
          <Wrench className="h-3.5 w-3.5 text-primary/75" />
          <span className="text-xs font-bold uppercase tracking-wider text-white/70">
            Coaching Drills
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white/55">
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
