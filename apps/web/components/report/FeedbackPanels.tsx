"use client";

// ─────────────────────────────────────────────────────────────────────────────
// StrengthsPanel.tsx + WeaknessesPanel.tsx
// Rendered as green / orange pill chips with entrance animation
// ─────────────────────────────────────────────────────────────────────────────

interface PillPanelProps {
  items: string[];
}

export function StrengthsPanel({ items }: PillPanelProps) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card h-full">
      <h3 className="mb-3.5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-subtle">
        <span className="text-emerald-400">✓</span> Strengths
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200 animate-fade-in"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
          >
            <span className="mt-0.5 text-emerald-400 flex-shrink-0">●</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WeaknessesPanel({ items }: PillPanelProps) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card h-full">
      <h3 className="mb-3.5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-subtle">
        <span className="text-amber-400">△</span> Areas to Improve
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-200 animate-fade-in"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
          >
            <span className="mt-0.5 text-amber-400 flex-shrink-0">▲</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
