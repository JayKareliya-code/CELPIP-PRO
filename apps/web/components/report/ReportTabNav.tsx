"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ReportTabNav.tsx — Underline tab bar for the report page
//
// Design follows the convention used by Linear / GitHub / Stripe Dashboard:
//   • Inactive tabs are muted text, no background.
//   • Active tab is bolder white with a 2px amber-gold underline below it.
//   • A sliding indicator animates the underline between tabs.
//   • Optional leading icon and trailing count badge per tab.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

export interface ReportTab {
  id:     string;
  label:  string;
  /** Optional leading icon — uses lucide-react components. */
  icon?:  LucideIcon;
  /** Optional count badge shown after the label (e.g. number of items). */
  badge?: number;
}

interface Props {
  tabs:      ReportTab[];
  activeTab: string;
  onChange:  (id: string) => void;
}

export function ReportTabNav({ tabs, activeTab, onChange }: Props) {
  // Track the active tab button's box so the sliding underline can animate
  // between tabs without layout thrash.
  const containerRef                = useRef<HTMLDivElement>(null);
  const btnRefs                     = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator]   = useState({ left: 0, width: 0, ready: false });

  // Recompute indicator position whenever the active tab changes. Also fires
  // once on mount to set the initial position without a flash.
  useEffect(() => {
    const container = containerRef.current;
    const btn       = btnRefs.current[activeTab];
    if (!container || !btn) return;

    const containerLeft = container.getBoundingClientRect().left;
    const btnRect       = btn.getBoundingClientRect();

    setIndicator({
      left:  btnRect.left - containerLeft + container.scrollLeft,
      width: btnRect.width,
      ready: true,
    });
  }, [activeTab]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Report sections"
      className="relative flex items-center gap-1 overflow-x-auto overflow-y-hidden no-scrollbar border-b border-border/60"
    >
      {/* Sliding underline indicator — amber-gold primary accent.
          Sits flush with the bottom of the container so it visually replaces
          the inside edge of the rail border for the active tab. Kept inside
          the box so overflow-y-hidden never clips it (which would otherwise
          drop the indicator entirely on narrow viewports). */}
      <div
        aria-hidden
        className={[
          "absolute bottom-0 h-[2px] rounded-full bg-primary transition-all duration-200 ease-out",
          indicator.ready ? "opacity-100" : "opacity-0",
        ].join(" ")}
        style={{ left: indicator.left, width: indicator.width }}
      />

      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon     = tab.icon;
        return (
          <button
            key={tab.id}
            ref={(el) => { btnRefs.current[tab.id] = el; }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`report-panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={[
              "relative flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap select-none",
              "transition-colors duration-150 outline-none",
              "focus-visible:text-white",
              isActive
                ? "text-white font-semibold"
                : "text-white/45 hover:text-white/80 font-medium",
            ].join(" ")}
          >
            {Icon && (
              <Icon
                className={[
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-white/40",
                ].join(" ")}
              />
            )}
            <span>{tab.label}</span>

            {/* Count badge — amber tint when active, muted otherwise. */}
            {typeof tab.badge === "number" && tab.badge > 0 && (
              <span
                className={[
                  "rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "bg-white/[0.06] text-white/35",
                ].join(" ")}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
