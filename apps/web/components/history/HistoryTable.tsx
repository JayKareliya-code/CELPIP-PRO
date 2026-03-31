"use client";

// ─────────────────────────────────────────────────────────────────────────────
// HistoryTable.tsx — Paginated attempt history table
//
// Backed by the useHistory hook (GET /api/v1/history).
// Columns: Date | Skill | Task | Band | Status | Action
// Server-side pagination — page state is lifted to the parent (HistoryPage).
// ─────────────────────────────────────────────────────────────────────────────

import Link                  from "next/link";
import { ChevronLeft, ChevronRight, ArrowUpRight, Loader2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScoreBadge }        from "@/components/common/ScoreBadge";
import { StatusBadge }       from "@/components/common/StatusBadge";
import { SkillBadge }        from "@/components/common/SkillBadge";
import { EmptyState }        from "@/components/common/EmptyState";
import { timeAgo }           from "@/lib/utils";
import type { PaginatedHistory, Skill } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface HistoryTableProps {
  history:   PaginatedHistory | undefined;
  isLoading: boolean;
  isError:   boolean;
  page:      number;
  onPageChange: (page: number) => void;
  activeSkill: Skill | null;
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow>
      {[...Array(6)].map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 rounded-md bg-border/60 animate-pulse" style={{ width: i === 2 ? "60%" : "80%" }} />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HistoryTable({
  history,
  isLoading,
  isError,
  page,
  onPageChange,
  activeSkill,
}: HistoryTableProps) {

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading && !history) {
    return (
      <div className="rounded-xl border border-border overflow-hidden shadow-card bg-surface">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="w-28">Skill</TableHead>
              <TableHead>Task</TableHead>
              <TableHead className="w-24 text-center">Band</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-20 text-right">Report</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
          </TableBody>
        </Table>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center space-y-2">
        <p className="text-base font-semibold text-foreground">Failed to load history</p>
        <p className="text-sm text-subtle">Please refresh the page to try again.</p>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!history || history.items.length === 0) {
    return (
      <EmptyState
        title={activeSkill ? `No ${activeSkill} attempts yet` : "No attempts yet"}
        description={
          activeSkill
            ? `Complete a ${activeSkill} task to see your history here.`
            : "Complete a speaking or writing task to see your history here."
        }
      />
    );
  }

  const { items, total, limit, has_next } = history;
  const start      = (page - 1) * limit + 1;
  const end        = Math.min(page * limit, total);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Table — with subtle opacity during re-fetch (placeholderData keeps old data visible) */}
      <div
        className={`rounded-xl border border-border overflow-hidden shadow-card bg-surface transition-opacity duration-200 ${
          isLoading ? "opacity-60 pointer-events-none" : "opacity-100"
        }`}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="hidden md:table-cell w-32">Date</TableHead>
              <TableHead className="w-28">Skill</TableHead>
              <TableHead>Task</TableHead>
              <TableHead className="w-24 text-center">Band</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-20 text-right">Report</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((item) => (
              <TableRow key={item.attempt_id} className="group">
                {/* Date — hidden on mobile */}
                <TableCell className="hidden md:table-cell text-sm text-subtle">
                  {timeAgo(item.created_at)}
                </TableCell>

                {/* Skill */}
                <TableCell>
                  <SkillBadge skill={item.skill} />
                </TableCell>

                {/* Task title */}
                <TableCell className="font-medium text-foreground text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span>{item.task_title}</span>
                    {/* Date shown inline on mobile */}
                    <span className="md:hidden text-xs text-subtle">{timeAgo(item.created_at)}</span>
                  </div>
                </TableCell>

                {/* Band score */}
                <TableCell className="text-center">
                  {item.estimated_band !== null && item.estimated_band !== undefined ? (
                    <ScoreBadge band={item.estimated_band} size="sm" />
                  ) : (
                    <span className="text-subtle text-xs">—</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>

                {/* Report link — only when complete */}
                <TableCell className="text-right">
                  {item.status === "complete" ? (
                    <Link
                      href={`/attempts/${item.attempt_id}/report`}
                      className="inline-flex items-center gap-1 text-xs text-primary
                                 hover:underline font-medium group-hover:text-primary-hover
                                 transition-colors"
                      aria-label={`View report for ${item.task_title}`}
                    >
                      View
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  ) : (
                    <span className="text-subtle text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between text-sm text-subtle">
        <span>
          Showing {start}–{end} of {total} attempt{total !== 1 ? "s" : ""}
        </span>

        <div className="flex items-center gap-2">
          {/* Loading indicator while fetching next page */}
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          )}

          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1 || isLoading}
            aria-label="Previous page"
            className="p-1.5 rounded-lg border border-border hover:bg-muted
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="tabular-nums min-w-[3rem] text-center">
            {page} / {totalPages}
          </span>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!has_next || isLoading}
            aria-label="Next page"
            className="p-1.5 rounded-lg border border-border hover:bg-muted
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
