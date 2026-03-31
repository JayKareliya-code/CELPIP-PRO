// ─────────────────────────────────────────────────────────────────────────────
// AttemptHistoryTable.tsx — Paginated table of all past attempts
//
// Uses shadcn/ui Table primitives.
// Columns: Skill | Task | Date | Status | Band | Actions
//
// Phase 1: client-side pagination with a fixed page size.
// Phase 2: swap `allAttempts` for a paginated API call via React Query.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState }        from "react";
import Link                from "next/link";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScoreBadge }      from "@/components/common/ScoreBadge";
import { StatusBadge }     from "@/components/common/StatusBadge";
import { SkillBadge }      from "@/components/common/SkillBadge";
import { EmptyState }      from "@/components/common/EmptyState";
import { timeAgo }         from "@/lib/utils";
import type { Attempt }    from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface AttemptHistoryTableProps {
  attempts:  Attempt[];
  pageSize?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Paginated table of attempt history.
 * Accepts the full `attempts` array and handles pagination client-side.
 * Swap the prop for a paginated API hook when Phase 2 lands.
 */
export function AttemptHistoryTable({
  attempts,
  pageSize = 10,
}: AttemptHistoryTableProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(attempts.length / pageSize));
  const start      = (page - 1) * pageSize;
  const rows       = attempts.slice(start, start + pageSize);

  if (attempts.length === 0) {
    return (
      <EmptyState
        title="No attempts yet"
        description="Complete a speaking or writing task to see your history here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden shadow-card bg-surface">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="w-28">Skill</TableHead>
              <TableHead>Task</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-24 text-center">Band</TableHead>
              <TableHead className="w-16 text-right">Report</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((attempt) => (
              <TableRow key={attempt.id} className="group">
                {/* Skill */}
                <TableCell>
                  <SkillBadge skill={attempt.skill} />
                </TableCell>

                {/* Task title */}
                <TableCell className="font-medium text-foreground text-sm">
                  {attempt.task_title}
                </TableCell>

                {/* Date — hidden on mobile */}
                <TableCell className="hidden md:table-cell text-sm text-subtle">
                  {timeAgo(attempt.created_at)}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <StatusBadge status={attempt.status} />
                </TableCell>

                {/* Band score */}
                <TableCell className="text-center">
                  {attempt.estimated_band !== null &&
                   attempt.estimated_band !== undefined ? (
                    <ScoreBadge band={attempt.estimated_band} size="sm" />
                  ) : (
                    <span className="text-subtle text-xs">—</span>
                  )}
                </TableCell>

                {/* Report link */}
                <TableCell className="text-right">
                  {attempt.status === "complete" ? (
                    <Link
                      href={`/attempts/${attempt.id}/report`}
                      className="inline-flex items-center gap-1 text-xs text-primary
                                 hover:underline font-medium"
                      aria-label={`View report for ${attempt.task_title}`}
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

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-subtle">
          <span>
            Showing {start + 1}–{Math.min(start + pageSize, attempts.length)} of{" "}
            {attempts.length} attempts
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="p-1.5 rounded-lg border border-border hover:bg-muted
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              className="p-1.5 rounded-lg border border-border hover:bg-muted
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
