// ─────────────────────────────────────────────────────────────────────────────
// components/admin/shared/StatChip.tsx
//
// Clickable stat pill used in admin filter bars (calibration, prompt tables).
// Extracted from PromptAnchorTable for reuse.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { cn } from "@/lib/utils";

type Variant = "neutral" | "success" | "warn";

interface StatChipProps {
  label:   string;
  value:   number;
  onClick: () => void;
  active:  boolean;
  variant: Variant;
}

const VARIANT_STYLES: Record<Variant, { active: string; idle: string }> = {
  neutral: {
    active: "border-primary/50 bg-primary/10 text-primary",
    idle:   "border-border text-subtle hover:border-primary/30",
  },
  success: {
    active: "border-primary/40 bg-primary/8 text-primary",
    idle:   "border-border text-subtle hover:border-primary/30",
  },
  warn: {
    active: "border-border bg-muted text-foreground",
    idle:   "border-border text-subtle hover:text-foreground",
  },
};

export function StatChip({ label, value, onClick, active, variant }: StatChipProps) {
  const { active: activeStyle, idle } = VARIANT_STYLES[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
        active ? activeStyle : idle,
      )}
    >
      <span className="text-foreground font-bold tabular-nums">{value}</span>
      <span>{label}</span>
    </button>
  );
}
