"use client";

// ─────────────────────────────────────────────────────────────────────────────
// HistoryFilterBar.tsx — Skill segmented control for the history page
//
// Uses CSS grid (grid-cols-3) so all three buttons are always equal width,
// regardless of label length. Full-width on mobile, inline on sm+.
// ─────────────────────────────────────────────────────────────────────────────

import type { Skill } from "@/lib/types";

interface Props {
  active: Skill | null;
  onChange: (skill: Skill | null) => void;
}

const TABS: { label: string; value: Skill | null; icon: string }[] = [
  { label: "All",      value: null,       icon: "📋" },
  { label: "Speaking", value: "speaking", icon: "🎤" },
  { label: "Writing",  value: "writing",  icon: "✍️" },
];

export function HistoryFilterBar({ active, onChange }: Props) {
  return (
    <div
      role="tablist"
      className="grid grid-cols-3 gap-1 sm:inline-grid rounded-xl border border-border bg-surface p-1"
    >
      {TABS.map(({ label, value, icon }) => {
        const isActive = active === value;
        return (
          <button
            key={label}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(value)}
            className={[
              "flex items-center justify-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium",
              "transition-all duration-150 whitespace-nowrap",
              isActive
                ? "bg-primary text-white shadow-sm"
                : "text-subtle hover:text-white hover:bg-white/5",
            ].join(" ")}
          >
            <span>{icon}</span> {label}
          </button>
        );
      })}
    </div>
  );
}
