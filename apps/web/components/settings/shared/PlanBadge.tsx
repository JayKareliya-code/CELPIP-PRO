// ─────────────────────────────────────────────────────────────────────────────
// components/settings/shared/PlanBadge.tsx
//
// Displays the user's plan (Starter / Pro / Ultra) as a pill badge.
// Intentionally a dumb, props-only component — no hooks, no data fetching.
// ─────────────────────────────────────────────────────────────────────────────

import { Zap } from "lucide-react";
import { cn }  from "@/lib/utils";

interface PlanBadgeProps {
  plan: string;
}

/**
 * Pill badge showing plan tier with appropriate colour scheme.
 * Ultra → amber-300 | Pro → amber-400 | Starter/other → muted white.
 */
export function PlanBadge({ plan }: PlanBadgeProps) {
  const label =
    plan === "ultra" ? "Ultra" :
    plan === "pro"   ? "Pro"   : "Starter";

  const cls =
    plan === "ultra"
      ? "bg-amber-900/40 border-amber-700/50 text-amber-300"
      : plan === "pro"
        ? "bg-amber-900/30 border-amber-700/40 text-amber-400"
        : "bg-white/[0.05] border-white/[0.10] text-white/40";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold select-none",
        cls,
      )}
    >
      <Zap className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
