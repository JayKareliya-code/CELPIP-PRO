"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ProgressOverviewStats.tsx — Four-cell overview stat strip at the top of
// the Progress page. Derives from overviewStats computed by useProgressData.
// ─────────────────────────────────────────────────────────────────────────────

import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn }         from "@/lib/utils";
import { formatBand } from "@/lib/utils";
import type { OverviewStats } from "@/lib/hooks/useProgressData";

// ── Trend badge ───────────────────────────────────────────────────────────────

const TREND_CONFIG = {
  up:     { icon: TrendingUp,   label: "Improving",  className: "text-success bg-success/10 border-success/20" },
  down:   { icon: TrendingDown, label: "Declining",   className: "text-danger  bg-danger/10  border-danger/20"  },
  steady: { icon: null,         label: "Steady",      className: "text-warning bg-warning/10 border-warning/20" },
  none:   { icon: Activity,     label: "No data yet", className: "text-subtle  bg-border/30  border-border"     },
} as const;

function TrendBadge({ trend }: { trend: OverviewStats["overall_trend"] }) {
  const cfg  = TREND_CONFIG[trend];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        cfg.className,
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {cfg.label}
    </span>
  );
}

// ── Stat cell ─────────────────────────────────────────────────────────────────

interface StatCellProps {
  label:     string;
  value:     React.ReactNode;
  sublabel?: string;
  loading?:  boolean;
}

function StatCell({ label, value, sublabel, loading }: StatCellProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle">{label}</p>
      {loading ? (
        <div className="h-7 w-14 animate-pulse rounded bg-border" />
      ) : (
        <p className="text-2xl font-bold text-foreground tabular-nums leading-none">{value}</p>
      )}
      {sublabel && !loading && (
        <p className="text-xs text-subtle">{sublabel}</p>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface ProgressOverviewStatsProps {
  stats:     OverviewStats;
  isLoading: boolean;
  skill:     "speaking" | "writing";
}

export function ProgressOverviewStats({ stats, isLoading, skill }: ProgressOverviewStatsProps) {
  const taskCount = skill === "speaking" ? 8 : 2;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCell
        label="Total Attempts"
        value={stats.total_attempts}
        sublabel={`Across all ${taskCount} ${skill} tasks`}
        loading={isLoading}
      />
      <StatCell
        label="Best Band"
        value={stats.best_band != null ? formatBand(stats.best_band) : "—"}
        sublabel="Highest score achieved"
        loading={isLoading}
      />
      <StatCell
        label="Avg Band"
        value={stats.avg_band != null ? formatBand(stats.avg_band) : "—"}
        sublabel="Mean across all attempts"
        loading={isLoading}
      />
      {/* Trend cell — uses a badge instead of a numeric value */}
      <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Trend</p>
        {isLoading ? (
          <div className="h-7 w-20 animate-pulse rounded bg-border" />
        ) : (
          <>
            <div className="mt-1">
              <TrendBadge trend={stats.overall_trend} />
            </div>
            <p className="text-xs text-subtle">Based on your score history</p>
          </>
        )}
      </div>
    </div>
  );
}
