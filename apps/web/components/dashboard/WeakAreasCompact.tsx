"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WeakAreasCompact.tsx — Pro-only focus area list on the dashboard
//
// Renders only when:
//   1. plan is "pro" or "ultra"
//   2. The API returns at least one item (i.e., user has scored attempts)
//
// Returns null silently in all other cases — no locked teaser, no placeholder.
// ─────────────────────────────────────────────────────────────────────────────

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useWeakAreas }   from "@/lib/hooks/useWeakAreas";
import { formatBand }     from "@/lib/utils";

const MAX_ITEMS = 3;

export function WeakAreasCompact() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const { items, isLoading: areasLoading } = useWeakAreas();

  // Don't render anything until we know the plan
  if (userLoading || areasLoading) return null;

  // Only show to Pro / Ultra users
  const isPro = user?.plan === "pro" || user?.plan === "ultra";
  if (!isPro) return null;

  // No data yet — stay silent
  if (items.length === 0) return null;

  const topWeakest = items.slice(0, MAX_ITEMS);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Focus Areas</h2>
        <p className="text-xs text-subtle mt-0.5">
          Your lowest-scoring rubric dimensions across recent attempts
        </p>
      </div>

      <div className="space-y-3">
        {topWeakest.map((area) => (
          <div key={area.dimension} className="flex items-center justify-between gap-4">
            <span className="text-sm text-foreground/80 truncate">{area.label}</span>
            <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
              {formatBand(area.avg_score)}
              <span className="text-xs font-normal text-subtle"> / 12</span>
            </span>
          </div>
        ))}
      </div>

      {items.length > MAX_ITEMS && (
        <p className="mt-3 text-xs text-subtle">
          Based on your last {topWeakest[0]?.attempt_count ?? 0} scored attempts.
        </p>
      )}
    </div>
  );
}
