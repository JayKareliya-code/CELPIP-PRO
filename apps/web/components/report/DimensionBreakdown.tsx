"use client";

// ─────────────────────────────────────────────────────────────────────────────
// DimensionBreakdown.tsx — Rubric dimension cards
//
// Hierarchy per card (top → bottom):
//   1. Dimension label (left, semibold) | Score number (right, coloured, lg)
//   2. Hairline progress bar — 1/4 width, aligned left
//   3. Commentary — full width, readable body size
//
// Each dimension is visually contained in its own card so they are
// immediately distinguishable from one another. Cards use a subtle
// left-accent border in the score colour as the only colour signal.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState }      from "react";
import { formatBand, roundBand }    from "@/lib/utils";
import type { ReportDimensionScore } from "@/lib/types";

interface Props {
  dimensions: ReportDimensionScore[];
}

function scoreBarColor(score: number): string {
  if (score >= 9) return "bg-emerald-400";
  if (score >= 6) return "bg-amber-400";
  return "bg-rose-400";
}

function scoreTextColor(score: number): string {
  if (score >= 9) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-rose-400";
}

function scoreAccent(score: number): string {
  if (score >= 9) return "bg-emerald-400/50";
  if (score >= 6) return "bg-amber-400/50";
  return "bg-rose-400/50";
}

export function DimensionBreakdown({ dimensions }: Props) {
  const [widths, setWidths] = useState<number[]>(dimensions.map(() => 0));

  // Stagger bar animations on mount
  useEffect(() => {
    const timers = dimensions.map((_, i) =>
      setTimeout(() => {
        setWidths((prev) => {
          const next = [...prev];
          next[i] = (roundBand(dimensions[i].score) / dimensions[i].max_score) * 100;
          return next;
        });
      }, i * 100)
    );
    return () => timers.forEach(clearTimeout);
  }, [dimensions]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">
        Dimension Breakdown
      </h3>

      <div className="flex flex-col gap-3">
        {dimensions.map((dim, i) => (
          <div
            key={dim.dimension}
            className="relative rounded-xl border border-border/60 bg-white/[0.02] px-4 py-3.5 pl-5 flex flex-col gap-2.5 animate-fade-in overflow-hidden"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
          >
            {/* Left accent stripe — score colour, 2px */}
            <span
              className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${scoreAccent(dim.score)}`}
            />

            {/* ── Dimension label ── */}
            <span className="text-sm font-semibold text-white/85 leading-snug">
              {dim.label}
            </span>

            {/* ── Bar + score inline: score sits right at the bar end ── */}
            <div className="flex items-center gap-3">
              <div className="h-0.5 w-1/4 rounded-full bg-white/[0.08] overflow-hidden flex-shrink-0">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${scoreBarColor(dim.score)}`}
                  style={{ width: `${widths[i]}%` }}
                />
              </div>
              <span className={`text-sm font-bold tabular-nums leading-none flex-shrink-0 ${scoreTextColor(dim.score)}`}>
                {formatBand(dim.score)}
                <span className="text-xs font-normal text-white/30 ml-0.5">/{dim.max_score}</span>
              </span>
            </div>

            {/* ── Commentary — body text, clearly subordinate ── */}
            {dim.commentary && dim.commentary.trim().length > 0 && (
              <p className="text-sm leading-relaxed text-white/55">
                {dim.commentary}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
