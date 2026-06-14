"use client";

// ─────────────────────────────────────────────────────────────────────────────
// FeedbackPanels.tsx — Strengths + Areas to Improve
//
// Subtle theme-matched styling. Active toggle uses the site's amber-gold
// primary. Cards use a thin left rule for at-a-glance semantic scanning
// (subtle green for strengths, subtle rose for weaknesses) but no loud
// pill fills or bright backgrounds.
// ─────────────────────────────────────────────────────────────────────────────

import { useState }                        from "react";
import { Check, AlertTriangle, Wrench }    from "lucide-react";
import type { ReportFeedbackItem }          from "@/lib/types";
import { LockedBlurOverlay }               from "./LockedBlurOverlay";

// ── Label helper — Title Case for dimension keys ─────────────────────────────

function formatLabel(label: string): string {
  return label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Strength Card ─────────────────────────────────────────────────────────────

function StrengthCard({ item, index }: { item: ReportFeedbackItem; index: number }) {
  const hasQuote = item.quote && item.quote.trim().length > 0;
  const hasLabel = item.label && item.label.trim().length > 0;

  return (
    <div
      className="relative rounded-xl border border-border bg-white/[0.015] p-4 flex flex-col gap-2.5 animate-fade-in
                 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-emerald-500/40 before:rounded-l-xl"
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: "both" }}
    >
      {hasLabel && (
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/45">
          <Check className="h-3 w-3 flex-shrink-0 text-emerald-500/80" />
          {formatLabel(item.label)}
        </div>
      )}
      <p className="text-sm leading-relaxed text-white/80">{item.observation}</p>
      {hasQuote && (
        <p className="text-[15px] font-medium leading-relaxed text-white/55 italic pl-3 border-l border-white/10">
          &ldquo;{item.quote}&rdquo;
        </p>
      )}
    </div>
  );
}

// ── Weakness Card ─────────────────────────────────────────────────────────────

function WeaknessCard({ item, index }: { item: ReportFeedbackItem; index: number }) {
  const hasQuote = item.quote && item.quote.trim().length > 0;
  const hasFix   = item.fix   && item.fix.trim().length   > 0;
  const hasLabel = item.label && item.label.trim().length > 0;

  return (
    <div
      className="relative rounded-xl border border-border bg-white/[0.015] p-4 flex flex-col gap-2.5 animate-fade-in
                 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-rose-500/40 before:rounded-l-xl"
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: "both" }}
    >
      {hasLabel && (
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/45">
          <AlertTriangle className="h-3 w-3 flex-shrink-0 text-rose-400/80" />
          {formatLabel(item.label)}
        </div>
      )}
      <p className="text-sm leading-relaxed text-white/80">{item.observation}</p>
      {hasQuote && (
        <p className="text-[15px] font-medium leading-relaxed text-white/55 italic pl-3 border-l border-white/10">
          &ldquo;{item.quote}&rdquo;
        </p>
      )}
      {hasFix && (
        <div className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <Wrench className="flex-shrink-0 h-3.5 w-3.5 text-primary/70 mt-0.5" />
          <p className="text-xs leading-relaxed text-white/70">{item.fix}</p>
        </div>
      )}
    </div>
  );
}

// ── Legacy single-panel wrappers (kept for backwards compat) ─────────────────

interface PanelProps { items: ReportFeedbackItem[]; }

export function StrengthsPanel({ items }: PanelProps) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 h-full flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Check className="h-3.5 w-3.5 text-emerald-500/80" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/70">Strengths</h2>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((item, i) => <StrengthCard key={i} item={item} index={i} />)}
      </div>
    </div>
  );
}

export function WeaknessesPanel({ items }: PanelProps) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 h-full flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-rose-400/80" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/70">Areas to Improve</h2>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((item, i) => <WeaknessCard key={i} item={item} index={i} />)}
      </div>
    </div>
  );
}

// ── Toggle panel ─────────────────────────────────────────────────────────────
//
// Default: "weaknesses" — users want to know what to fix first.
// Toggle pill uses the amber-gold primary for the active state, replacing the
// previous rose/emerald bright fills.

type FeedbackTab = "weaknesses" | "strengths";

interface ToggleProps {
  strengths:  ReportFeedbackItem[];
  weaknesses: ReportFeedbackItem[];
  locked?:    boolean;
}

export function FeedbackToggle({ strengths, weaknesses, locked }: ToggleProps) {
  const [active, setActive] = useState<FeedbackTab>("weaknesses");

  const hasStrengths  = strengths.length  > 0;
  const hasWeaknesses = weaknesses.length > 0;

  if (!hasStrengths && !hasWeaknesses) return null;
  if (!hasStrengths) return <WeaknessesPanel items={weaknesses} />;
  if (!hasWeaknesses) return <StrengthsPanel  items={strengths}  />;

  const cardList = (
    <div className="flex flex-col gap-2.5">
      {active === "weaknesses"
        ? weaknesses.map((item, i) => <WeaknessCard key={i} item={item} index={i} />)
        : strengths.map((item,  i) => <StrengthCard key={i} item={item} index={i} />)
      }
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">

      {/* ── Toggle pill — primary amber accent for the active side ──────── */}
      <div className="flex items-center gap-1 self-start rounded-xl border border-border/60 bg-white/[0.02] p-1">

        <button
          onClick={() => !locked && setActive("weaknesses")}
          className={[
            "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-150",
            active === "weaknesses"
              ? "bg-white/[0.06] border border-white/10 text-white/90 shadow-sm"
              : "border border-transparent text-white/45 hover:text-white/70",
          ].join(" ")}
        >
          {/* Tiny status dot — rose for the weakness side */}
          <span className={`h-1.5 w-1.5 rounded-full ${active === "weaknesses" ? "bg-rose-400/80" : "bg-rose-400/30"}`} />
          Areas to Improve
          <span className={[
            "rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
            active === "weaknesses" ? "bg-white/10 text-white/75" : "bg-white/[0.05] text-white/35",
          ].join(" ")}>
            {weaknesses.length}
          </span>
        </button>

        <button
          onClick={() => !locked && setActive("strengths")}
          className={[
            "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-150",
            active === "strengths"
              ? "bg-white/[0.06] border border-white/10 text-white/90 shadow-sm"
              : "border border-transparent text-white/45 hover:text-white/70",
          ].join(" ")}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${active === "strengths" ? "bg-emerald-500/80" : "bg-emerald-500/30"}`} />
          Strengths
          <span className={[
            "rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
            active === "strengths" ? "bg-white/10 text-white/75" : "bg-white/[0.05] text-white/35",
          ].join(" ")}>
            {strengths.length}
          </span>
        </button>
      </div>

      {/* Card list */}
      {locked ? (
        <LockedBlurOverlay label="Feedback Details" blurPx={4} opacity={0.3}>
          {cardList}
        </LockedBlurOverlay>
      ) : (
        cardList
      )}
    </div>
  );
}
