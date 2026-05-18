"use client";

// ─────────────────────────────────────────────────────────────────────────────
// HistoryFilterBar.tsx — Skill segmented control for the history page
//
// Uses CSS grid (grid-cols-3) so all three buttons are always equal width,
// regardless of label length. Full-width on mobile, inline on sm+.
// Active state uses the subtle white-inset pill pattern used elsewhere in
// the app (FeedbackToggle, etc.) so amber-gold is reserved for true CTAs.
// ─────────────────────────────────────────────────────────────────────────────

import { Layers, Mic, PenLine, type LucideIcon } from "lucide-react";
import type { Skill } from "@/lib/types";

interface Props {
  active: Skill | null;
  onChange: (skill: Skill | null) => void;
}

const TABS: { label: string; value: Skill | null; icon: LucideIcon }[] = [
  { label: "All",      value: null,       icon: Layers  },
  { label: "Speaking", value: "speaking", icon: Mic     },
  { label: "Writing",  value: "writing",  icon: PenLine },
];

export function HistoryFilterBar({ active, onChange }: Props) {
  return (
    <div
      role="tablist"
      className="grid grid-cols-3 gap-1 sm:inline-grid rounded-xl border border-border bg-surface p-1"
    >
      {TABS.map(({ label, value, icon: Icon }) => {
        const isActive = active === value;
        return (
          <button
            key={label}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(value)}
            className={[
              "flex items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium",
              "transition-colors duration-150 whitespace-nowrap",
              isActive
                ? "bg-white/[0.06] border border-white/10 text-white shadow-sm"
                : "border border-transparent text-white/45 hover:text-white/80 hover:bg-white/[0.03]",
            ].join(" ")}
          >
            <Icon
              className={[
                "h-3.5 w-3.5 shrink-0 transition-colors",
                isActive ? "text-primary" : "text-white/35",
              ].join(" ")}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}
