"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ReportTabNav.tsx — Animated pill tab bar for the report page
//
// Renders a horizontal row of tab buttons with:
//   • Sliding background indicator (tracks active tab via measureRef)
//   • Optional count badge per tab
//   • Full keyboard accessibility (role=tablist, aria-selected)
//   • Sticky positioning is handled by the parent (ProReport)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";

export interface ReportTab {
  id:     string;
  label:  string;
  badge?: number;   // optional count badge shown after the label
}

interface Props {
  tabs:      ReportTab[];
  activeTab: string;
  onChange:  (id: string) => void;
}

export function ReportTabNav({ tabs, activeTab, onChange }: Props) {
  // Track the bounding rect of the active tab button so the sliding
  // indicator background can be positioned absolutely behind it.
  const containerRef                      = useRef<HTMLDivElement>(null);
  const btnRefs                           = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator]         = useState({ left: 0, width: 0, ready: false });

  // Recompute indicator position whenever the active tab changes
  // (also fires once on mount to set the initial position without a flash).
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
      className="relative flex items-center gap-1 rounded-xl border border-border bg-surface p-1 overflow-x-auto scrollbar-none"
    >
      {/* Sliding background indicator — hidden until first measurement */}
      <div
        aria-hidden
        className={[
          "absolute top-1 bottom-1 rounded-lg transition-all duration-200 ease-out",
          "bg-white/[0.07] border border-white/[0.06]",
          indicator.ready ? "opacity-100" : "opacity-0",
        ].join(" ")}
        style={{ left: indicator.left, width: indicator.width }}
      />

      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => { btnRefs.current[tab.id] = el; }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`report-panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={[
              // Base: relative so the button sits above the sliding indicator
              "relative flex flex-1 items-center justify-center gap-2",
              "rounded-lg px-5 py-2.5 text-sm font-medium",
              "transition-colors duration-150 whitespace-nowrap select-none",
              isActive
                ? "text-white"
                : "text-white/40 hover:text-white/70",
            ].join(" ")}
          >
          <span>{tab.label}</span>

            {/* Count badge */}
            {typeof tab.badge === "number" && tab.badge > 0 && (
              <span
                className={[
                  "rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
                  isActive
                    ? "bg-primary/25 text-primary-light"
                    : "bg-white/[0.08] text-white/30",
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
