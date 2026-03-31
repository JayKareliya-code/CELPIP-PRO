import { Target, Pencil } from "lucide-react";
import { BAND_LABELS } from "@/lib/constants";
import type { AppUser } from "@/lib/types";

interface TargetBandWidgetProps {
  user: AppUser;
}

/**
 * Displays the user's target band score with colour-coded ring indicator.
 * Edit action is a visual placeholder — target-editing modal arrives in Phase 2.
 */
export function TargetBandWidget({ user }: TargetBandWidgetProps) {
  const { target_band } = user;
  const label = target_band != null ? (BAND_LABELS[target_band] ?? "") : "";

  return (
    <div className="rounded-xl border border-border bg-surface shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Target Band</h2>
        </div>
        {/* Placeholder — edit modal in Phase 2 */}
        <button
          title="Edit target band (coming Phase 2)"
          disabled
          aria-label="Edit target band"
          className="p-1.5 rounded-md text-subtle hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {target_band != null ? (
        <div className="flex items-center gap-4">
          {/* Circular band indicator */}
          <div className="w-16 h-16 rounded-full bg-primary-light border-4 border-primary flex items-center justify-center shrink-0">
            <span className="text-2xl font-extrabold text-primary leading-none">
              {target_band}
            </span>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{label}</p>
            <p className="text-xs text-subtle mt-0.5">
              CELPIP Band {target_band} / 12
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-subtle">No target band set yet.</p>
      )}
    </div>
  );
}
