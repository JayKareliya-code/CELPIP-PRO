"use client";

import { useState }                        from "react";
import { Check, AlertTriangle, Wrench }    from "lucide-react";
import type { ReportFeedbackItem }          from "@/lib/types";

// ── Strength Card ─────────────────────────────────────────────────────────────

function StrengthCard({ item, index }: { item: ReportFeedbackItem; index: number }) {
  const hasQuote = item.quote && item.quote.trim().length > 0;
  const hasLabel = item.label && item.label.trim().length > 0;

  return (
    <div
      className="rounded-xl border border-border bg-white/[0.02] p-4 flex flex-col gap-2.5 border-l-2 border-l-emerald-500 animate-fade-in"
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: "both" }}
    >
      {hasLabel && (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
          <Check className="h-2.5 w-2.5 flex-shrink-0" />
          {item.label}
        </span>
      )}
      <p className="text-sm leading-relaxed text-white/80">{item.observation}</p>
      {hasQuote && (
        <p className="text-base font-medium leading-relaxed text-white/60 italic pl-3 border-l border-white/10">
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
      className="rounded-xl border border-border bg-white/[0.02] p-4 flex flex-col gap-2.5 border-l-2 border-l-rose-500 animate-fade-in"
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: "both" }}
    >
      {hasLabel && (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-rose-400">
          <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" />
          {item.label}
        </span>
      )}
      <p className="text-sm leading-relaxed text-white/80">{item.observation}</p>
      {hasQuote && (
        <p className="text-base font-medium leading-relaxed text-white/60 italic pl-3 border-l border-rose-500/30">
          &ldquo;{item.quote}&rdquo;
        </p>
      )}
      {hasFix && (
        <div className="flex items-start gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
          <Wrench className="flex-shrink-0 h-3.5 w-3.5 text-white/30 mt-0.5" />
          <p className="text-xs leading-relaxed text-white/55">{item.fix}</p>
        </div>
      )}
    </div>
  );
}

// ── Legacy panel wrappers (kept for backwards compat) ────────────────────────

interface PanelProps { items: ReportFeedbackItem[]; }

export function StrengthsPanel({ items }: PanelProps) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 h-full flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Check className="h-3.5 w-3.5 text-emerald-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Strengths</h3>
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
        <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400">Areas to Improve</h3>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((item, i) => <WeaknessCard key={i} item={item} index={i} />)}
      </div>
    </div>
  );
}

// ── Phase 2B: FeedbackToggle — full-width, toggle between S/W ────────────────
//
// Default: "weaknesses" — users want to know what to fix first.
// Toggle pill shows count badges for both sides.
// Cards render at full width (no cramped 2-column grid).

type FeedbackTab = "weaknesses" | "strengths";

interface ToggleProps {
  strengths:  ReportFeedbackItem[];
  weaknesses: ReportFeedbackItem[];
}

export function FeedbackToggle({ strengths, weaknesses }: ToggleProps) {
  const [active, setActive] = useState<FeedbackTab>("weaknesses");

  const hasStrengths  = strengths.length  > 0;
  const hasWeaknesses = weaknesses.length > 0;

  // If only one side has items, show it without toggle
  if (!hasStrengths && !hasWeaknesses) return null;
  if (!hasStrengths) return <WeaknessesPanel items={weaknesses} />;
  if (!hasWeaknesses) return <StrengthsPanel  items={strengths}  />;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">

      {/* ── Toggle pill ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 self-start rounded-xl border border-border/60 bg-white/[0.03] p-1">
        <button
          onClick={() => setActive("weaknesses")}
          className={[
            "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-150",
            active === "weaknesses"
              ? "bg-rose-500/15 border border-rose-500/30 text-rose-400"
              : "text-white/40 hover:text-white/65",
          ].join(" ")}
        >
          <AlertTriangle className="h-3 w-3" />
          Areas to Improve
          <span className={[
            "rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
            active === "weaknesses" ? "bg-rose-500/20 text-rose-300" : "bg-white/[0.08] text-white/30",
          ].join(" ")}>
            {weaknesses.length}
          </span>
        </button>

        <button
          onClick={() => setActive("strengths")}
          className={[
            "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-150",
            active === "strengths"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
              : "text-white/40 hover:text-white/65",
          ].join(" ")}
        >
          <Check className="h-3 w-3" />
          Strengths
          <span className={[
            "rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
            active === "strengths" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/[0.08] text-white/30",
          ].join(" ")}>
            {strengths.length}
          </span>
        </button>
      </div>

      {/* ── Full-width cards ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5">
        {active === "weaknesses"
          ? weaknesses.map((item, i) => <WeaknessCard key={i} item={item} index={i} />)
          : strengths.map((item,  i) => <StrengthCard key={i} item={item} index={i} />)
        }
      </div>
    </div>
  );
}
