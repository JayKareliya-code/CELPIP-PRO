"use client";

// ─────────────────────────────────────────────────────────────────────────────
// FeedbackPanels.tsx — Strength + Weakness coaching cards
//
// New design: each item is a card with:
//   • Dimension label chip (coloured)
//   • Observation text
//   • Verbatim transcript quote (styled as a blockquote bubble)
//   • Fix text for weaknesses (amber highlight)
//
// Legacy format (plain string items with empty label/quote) degrades gracefully
// to a simple bullet observation — no quote bubble, no fix.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReportFeedbackItem } from "@/lib/types";

// ── Strength Card ─────────────────────────────────────────────────────────────

function StrengthCard({ item, index }: { item: ReportFeedbackItem; index: number }) {
  const hasQuote = item.quote && item.quote.trim().length > 0;
  const hasLabel = item.label && item.label.trim().length > 0;

  return (
    <div
      className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 flex flex-col gap-2.5 animate-fade-in"
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: "both" }}
    >
      {/* Label chip */}
      {hasLabel && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
          ✓ {item.label}
        </span>
      )}

      {/* Observation */}
      <p className="text-sm leading-relaxed text-white/80">{item.observation}</p>

      {/* Verbatim quote bubble */}
      {hasQuote && (
        <div className="relative pl-3 border-l-2 border-emerald-400/40">
          <p className="text-xs leading-relaxed text-emerald-300/80 italic">
            &ldquo;{item.quote}&rdquo;
          </p>
          <span className="absolute -left-[18px] top-0 text-[9px] text-emerald-400/50 select-none">💬</span>
        </div>
      )}
    </div>
  );
}

// ── Weakness Card ─────────────────────────────────────────────────────────────

function WeaknessCard({ item, index }: { item: ReportFeedbackItem; index: number }) {
  const hasQuote = item.quote && item.quote.trim().length > 0;
  const hasFix   = item.fix && item.fix.trim().length > 0;
  const hasLabel = item.label && item.label.trim().length > 0;

  return (
    <div
      className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4 flex flex-col gap-2.5 animate-fade-in"
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: "both" }}
    >
      {/* Label chip */}
      {hasLabel && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-rose-400">
          ⚠ {item.label}
        </span>
      )}

      {/* Observation */}
      <p className="text-sm leading-relaxed text-white/80">{item.observation}</p>

      {/* Verbatim quote bubble */}
      {hasQuote && (
        <div className="relative pl-3 border-l-2 border-rose-400/30">
          <p className="text-xs leading-relaxed text-rose-300/70 italic">
            &ldquo;{item.quote}&rdquo;
          </p>
          <span className="absolute -left-[18px] top-0 text-[9px] text-rose-400/50 select-none">💬</span>
        </div>
      )}

      {/* Fix row */}
      {hasFix && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/[0.08] border border-amber-500/20 px-3 py-2">
          <span className="flex-shrink-0 text-sm text-amber-400 mt-0.5">🔧</span>
          <p className="text-xs leading-relaxed text-amber-200/90">{item.fix}</p>
        </div>
      )}
    </div>
  );
}

// ── Panel wrappers ────────────────────────────────────────────────────────────

interface PanelProps {
  items: ReportFeedbackItem[];
}

export function StrengthsPanel({ items }: PanelProps) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 h-full flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
        Strengths
      </h3>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <StrengthCard key={i} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}

export function WeaknessesPanel({ items }: PanelProps) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 h-full flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-rose-400">
        Areas to Improve
      </h3>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <WeaknessCard key={i} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
