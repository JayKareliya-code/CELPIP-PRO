"use client";

// ─────────────────────────────────────────────────────────────────────────────
// DimensionBreakdown.tsx — Progress bars per rubric dimension
//
// P1 upgrade: each dimension row now shows a one-sentence commentary inline
// directly below the bar — no tooltip, no hover needed.  The reason is always
// visible so the user immediately understands why they got that score.
// Commentary is empty ("") for legacy reports — the row just shows bar + score.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState }      from "react";
import { formatBand, roundBand }    from "@/lib/utils";
import type { ReportDimensionScore } from "@/lib/types";

interface Props {
  dimensions: ReportDimensionScore[];
}

function scoreColor(score: number): string {
  if (score >= 9) return "bg-emerald-400";
  if (score >= 6) return "bg-amber-400";
  return "bg-rose-400";
}

function scoreTextColor(score: number): string {
  if (score >= 9) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-rose-400";
}

export function DimensionBreakdown({ dimensions }: Props) {
  const [widths, setWidths] = useState<number[]>(dimensions.map(() => 0));

  // Stagger the bar animations on mount
  useEffect(() => {
    const timers = dimensions.map((_, i) =>
      setTimeout(() => {
        setWidths((prev) => {
          const next = [...prev];
          // Use rounded score so bar width matches the displayed number
          next[i] = (roundBand(dimensions[i].score) / dimensions[i].max_score) * 100;
          return next;
        });
      }, i * 80)
    );
    return () => timers.forEach(clearTimeout);
  }, [dimensions]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
      <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-subtle">
        Dimension Breakdown
      </h3>
      <div className="space-y-5">
        {dimensions.map((dim, i) => (
          <div key={dim.dimension} className="space-y-1.5">
            {/* Score row */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/90">{dim.label}</span>
              <span className={`text-sm font-bold tabular-nums ${scoreTextColor(dim.score)}`}>
                {formatBand(dim.score)}<span className="text-subtle font-normal">/{dim.max_score}</span>
              </span>
            </div>

            {/* Progress bar track */}
            <div className="h-2 w-full rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${scoreColor(dim.score)}`}
                style={{
                  width: `${widths[i]}%`,
                  boxShadow: dim.score >= 9
                    ? "0 0 8px rgba(52,211,153,0.5)"
                    : dim.score >= 6
                    ? "0 0 8px rgba(251,191,36,0.4)"
                    : "0 0 8px rgba(248,113,113,0.4)",
                }}
              />
            </div>

            {/* Inline commentary — shown directly below the bar when available */}
            {dim.commentary && dim.commentary.trim().length > 0 && (
              <p className="text-xs leading-relaxed text-white/45 pt-0.5">
                {dim.commentary}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
