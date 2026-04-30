"use client";

// ─────────────────────────────────────────────────────────────────────────────
// FeedbackPanels.tsx — Strengths + Weaknesses lists
// Coloured title text, no icon symbols, no background highlight cards.
// ─────────────────────────────────────────────────────────────────────────────

interface PillPanelProps {
  items: string[];
}

export function StrengthsPanel({ items }: PillPanelProps) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 h-full">
      <h3 className="mb-3.5 text-sm font-semibold uppercase tracking-wider text-emerald-400">
        Strengths
      </h3>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li
            key={item.slice(0, 40)}
            className="flex items-start gap-2.5 text-sm text-white/75 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
          >
            <span className="mt-[3px] text-emerald-400 flex-shrink-0 text-xs">●</span>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WeaknessesPanel({ items }: PillPanelProps) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 h-full">
      <h3 className="mb-3.5 text-sm font-semibold uppercase tracking-wider text-rose-400">
        Areas to Improve
      </h3>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li
            key={item.slice(0, 40)}
            className="flex items-start gap-2.5 text-sm text-white/75 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
          >
            <span className="mt-[3px] text-rose-400 flex-shrink-0 text-xs">●</span>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
