import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Weak Areas widget — Phase 1 stub.
 * Shows skeleton rows to communicate the shape of the forthcoming feature.
 * Real weak-area detection arrives in Phase 2 after the scoring pipeline is wired.
 */
export function WeakAreasWidget() {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <h2 className="text-base font-semibold text-foreground">Weak Areas</h2>
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-subtle">
        Weak area detection available after Phase 2 scoring pipeline.
      </p>
    </div>
  );
}
