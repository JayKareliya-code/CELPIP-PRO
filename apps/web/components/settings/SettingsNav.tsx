"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/settings/SettingsNav.tsx
//
// Left sidebar (desktop) / horizontal scrollable pill row (mobile).
// Accepts the active tab and an onChange callback so it stays stateless.
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";
import { SETTINGS_TABS, type SettingsTab } from "@/components/settings/types";

interface SettingsNavProps {
  active:   SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

export function SettingsNav({ active, onChange }: SettingsNavProps) {
  return (
    <nav
      className="lg:w-52 shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto no-scrollbar pb-1 lg:pb-0"
      aria-label="Settings navigation"
    >
      {SETTINGS_TABS.map(({ id, label, icon: Icon }) => {
        const isActive  = active === id;
        const isDanger  = id === "danger";

        return (
          <button
            key={id}
            id={`settings-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-150 w-full text-left",
              isActive
                ? isDanger
                  ? "bg-red-500/10 border border-red-500/20 text-red-400"
                  : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                : isDanger
                  ? "border border-transparent text-white/40 hover:text-red-400/80 hover:bg-red-500/[0.06]"
                  : "border border-transparent text-white/40 hover:text-white/80 hover:bg-white/[0.04]",
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {/* Label hidden on xs (icon-only) — visible from sm+ */}
            <span className="hidden sm:block">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
