// ─────────────────────────────────────────────────────────────────────────────
// components/settings/shared/PlanBadge.tsx
//
// Displays the user's plan (Starter / Pro) as a pill badge.
// Intentionally a dumb, props-only component — no hooks, no data fetching.
// ─────────────────────────────────────────────────────────────────────────────

import { Zap } from "lucide-react";
import { cn }  from "@/lib/utils";

interface PlanBadgeProps {
  plan: string;
}

/**
 * Pill badge showing plan tier with appropriate colour scheme.
 * Pro → amber-400 | Starter/other → muted white.
 */
export function PlanBadge({ plan }: PlanBadgeProps) {
  const label = plan === "pro" ? "Pro" : "Starter";

  const cls =
    plan === "pro"
      ? "bg-primary/10 border-primary/20 text-primary"
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
