"use client";

// ─────────────────────────────────────────────────────────────────────────────
// RecentAttemptsFeed.tsx — Last 5 attempts for the active skill on /progress
//
// Receives items directly from the parent (no extra fetch — data comes from
// the same useProgressData call). Reuses existing common badge components.
// ─────────────────────────────────────────────────────────────────────────────

import Link             from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ScoreBadge }  from "@/components/common/ScoreBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { timeAgo }     from "@/lib/utils";
import type { HistoryItem, Skill } from "@/lib/types";

// ── Row ───────────────────────────────────────────────────────────────────────

function AttemptRow({ item }: { item: HistoryItem }) {
  return (
    <div className="flex items-center gap-3 py-3 border-t border-border group">
      {/* Task pill */}
      <span className="shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-subtle">
        Task {item.task_number}
      </span>

      {/* Title + date */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.task_title}</p>
        <p className="text-xs text-subtle">{timeAgo(item.created_at)}</p>
      </div>

      {/* Score + Report — fixed tab gap for column alignment */}
      <div className="flex items-center gap-12 shrink-0">
        {item.estimated_band != null ? (
          <ScoreBadge band={item.estimated_band} plain />
        ) : (
          <StatusBadge status={item.status} />
        )}

        {item.status === "complete" ? (
          <Link
            href={`/attempts/${item.attempt_id}/report?from=/progress`}
            aria-label={`View report for ${item.task_title}`}
            className="text-xs font-medium text-primary hover:text-primary-hover inline-flex items-center gap-0.5 transition-colors shrink-0"
          >
            View <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : (
          <span className="w-14 shrink-0" />
        )}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-t border-border animate-pulse">
      <div className="h-5 w-12 rounded-full bg-border" />
      <div className="h-4 flex-1 rounded bg-border" />
      <div className="h-5 w-10 rounded-full bg-border" />
      <div className="h-4 w-14 rounded bg-border" />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface RecentAttemptsFeedProps {
  items:     HistoryItem[];
  skill:     Skill;
  isLoading: boolean;
}

export function RecentAttemptsFeed({ items, skill, isLoading }: RecentAttemptsFeedProps) {
  return (
    <section>
      {/* Header — matches RecentAttemptsCompact style */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-foreground">
          Recent {skill === "speaking" ? "Speaking" : "Writing"} Attempts
        </h2>
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Table body */}
      <div className="rounded-xl border border-border bg-surface px-5">
        {isLoading && (
          <>
            {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
          </>
        )}

        {!isLoading && items.length === 0 && (
          <p className="py-8 text-center text-sm text-subtle">
            No {skill} attempts yet — head to{" "}
            <Link
              href={`/${skill}`}
              className="text-primary hover:underline"
            >
              {skill === "speaking" ? "Speaking" : "Writing"}
            </Link>{" "}
            to start practising.
          </p>
        )}

        {!isLoading && items.map((item) => (
          <AttemptRow key={item.attempt_id} item={item} />
        ))}
      </div>
    </section>
  );
}
