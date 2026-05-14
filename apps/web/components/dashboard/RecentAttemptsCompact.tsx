"use client";

// ─────────────────────────────────────────────────────────────────────────────
// RecentAttemptsCompact.tsx — Last 5 attempts for the dashboard
//
// Uses the shared useHistory hook with a fixed limit of 5. Does NOT paginate —
// the "View all" link sends the user to /history for the full table.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useHistory } from "@/lib/hooks/useHistory";
import { ScoreBadge } from "@/components/common/ScoreBadge";
import { SkillBadge } from "@/components/common/SkillBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { timeAgo } from "@/lib/utils";
import type { HistoryItem } from "@/lib/types";

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-t border-border animate-pulse">
      <div className="h-5 w-16 rounded-full bg-border" />
      <div className="h-4 flex-1 rounded bg-border" />
      <div className="h-5 w-10 rounded-full bg-border" />
      <div className="h-4 w-12 rounded bg-border" />
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function AttemptRow({ item }: { item: HistoryItem }) {
  return (
    <div className="flex items-center gap-3 py-3 border-t border-border group">
      {/* Icon only — no pill background */}
      <SkillBadge skill={item.skill} iconOnly />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.task_title}</p>
        <p className="text-xs text-subtle">{timeAgo(item.created_at)}</p>
      </div>

      {/* Score + View — fixed tab gap between them */}
      <div className="flex items-center gap-12 shrink-0">
        {item.estimated_band != null ? (
          <ScoreBadge band={item.estimated_band} plain />
        ) : (
          <StatusBadge status={item.status} />
        )}

        {item.status === "complete" ? (
          <Link
            href={`/attempts/${item.attempt_id}/report`}
            aria-label={`View report for ${item.task_title}`}
            className="text-xs font-medium text-primary hover:text-primary-hover inline-flex items-center gap-0.5 transition-colors shrink-0"
          >
            View <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : (
          <span className="w-10 shrink-0" />
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const DASHBOARD_LIMIT = 5;

export function RecentAttemptsCompact() {
  // page=1, skill=null — always shows the 5 most recent regardless of skill
  const { history, isLoading, isError } = useHistory(null, 1);

  // Trim to DASHBOARD_LIMIT even if the hook returns more
  const items = (history?.items ?? []).slice(0, DASHBOARD_LIMIT);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-foreground">Recent Attempts</h2>
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Body */}
      {isLoading && (
        <>
          {Array.from({ length: DASHBOARD_LIMIT }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </>
      )}

      {isError && (
        <p className="pt-4 text-sm text-subtle text-center">
          Could not load attempts. <button onClick={() => window.location.reload()} className="text-primary hover:underline">Retry</button>
        </p>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <p className="pt-6 pb-2 text-sm text-subtle text-center">
          No attempts yet — start practising to see your history here.
        </p>
      )}

      {!isLoading && !isError && items.map((item) => (
        <AttemptRow key={item.attempt_id} item={item} />
      ))}
    </div>
  );
}
