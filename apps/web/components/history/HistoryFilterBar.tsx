"use client";

// ─────────────────────────────────────────────────────────────────────────────
// HistoryFilterBar.tsx — Skill segmented control for the history page
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
      className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1"
    >
      {TABS.map(({ label, value, icon }) => {
        const isActive = active === value;
        return (
          <button
            key={label}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(value)}
            className={`
              flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium
              transition-all duration-150
              ${isActive
                ? "bg-primary text-white shadow-sm"
                : "text-subtle hover:text-white hover:bg-white/5"
              }
            `}
          >
            <span>{icon}</span> {label}
          </button>
        );
      })}
    </div>
  );
}
