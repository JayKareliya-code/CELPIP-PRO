import { TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Attempt } from "@/lib/types";

interface ProgressSummaryWidgetProps {
  attempts: Attempt[];
}

/** Derives the latest completed band per skill from attempt history. */
function getLatestBand(
  attempts: Attempt[],
  skill: "speaking" | "writing"
): number | null {
  const completed = attempts
    .filter((a) => a.skill === skill && a.status === "complete" && a.estimated_band)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return completed[0]?.estimated_band ?? null;
}

/**
 * Phase 1 stub — shows latest estimated band per skill as a static progress bar.
 * Full trend charts arrive in Phase 3.
 */
export function ProgressSummaryWidget({ attempts }: ProgressSummaryWidgetProps) {
  const speakingBand = getLatestBand(attempts, "speaking");
  const writingBand = getLatestBand(attempts, "writing");

  const rows = [
    { label: "Speaking", band: speakingBand },
    { label: "Writing", band: writingBand },
  ];

  return (
    <div className="rounded-xl border border-border bg-surface shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          Estimated Band
        </h2>
      </div>

      <div className="space-y-4">
        {rows.map(({ label, band }) => (
          <div key={label}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-medium text-foreground">{label}</span>
              <span className="text-sm font-bold text-primary">
                {band !== null ? band : "—"}
                <span className="text-subtle font-normal"> / 12</span>
              </span>
            </div>
            <Progress
              value={band !== null ? (band / 12) * 100 : 0}
              className="h-2"
            />
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-subtle">
        Full progress charts available in Phase 3.
      </p>
    </div>
  );
}
