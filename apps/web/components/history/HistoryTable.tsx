"use client";

// ─────────────────────────────────────────────────────────────────────────────
// HistoryTable.tsx — Paginated attempt history
//
// Mobile (< md): card list — each attempt is a tappable card row
// Desktop (md+): data table — Date | Skill | Task | Band | Status | Report
// ─────────────────────────────────────────────────────────────────────────────

import Link                  from "next/link";
import { ArrowUpRight, Loader2, ArrowRight, Clock, XCircle } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScoreBadge }        from "@/components/common/ScoreBadge";
import { StatusBadge }       from "@/components/common/StatusBadge";
import { SkillBadge }        from "@/components/common/SkillBadge";
import { EmptyState }        from "@/components/common/EmptyState";
import { PaginationFooter }  from "@/components/common/PaginationFooter";
import { timeAgo, formatBand } from "@/lib/utils";
import type { PaginatedHistory, Skill } from "@/lib/types";

// ── Unified state badge (mobile cards only) ───────────────────────────────────
// One badge replaces both ScoreBadge + StatusBadge:
//   complete + score  → coloured band number
//   processing        → amber spinner
//   failed            → red "Failed"
//   pending/cancelled → subtle label

function AttemptStateBadge({
  status,
  band,
}: {
  status: PaginatedHistory["items"][number]["status"];
  band:   number | null | undefined;
}) {
  // Scored result
  if (status === "complete" && band !== null && band !== undefined) {
    const colour =
      band >= 9 ? "bg-success-light text-success border-success/30"
    : band >= 6 ? "bg-warning-light text-warning border-warning/30"
    :             "bg-danger-light  text-danger  border-danger/30";
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums ${colour}`}>
        {formatBand(band)}
      </span>
    );
  }

  // Processing — spinning loader
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning-light px-2.5 py-0.5 text-xs font-medium text-warning">
        <Loader2 className="w-3 h-3 animate-spin" />
        Scoring
      </span>
    );
  }

  // Failed
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger-light px-2.5 py-0.5 text-xs font-medium text-danger">
        <XCircle className="w-3 h-3" />
        Failed
      </span>
    );
  }

  // Pending / cancelled / complete-no-score
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-subtle">
      <Clock className="w-3 h-3" />
      {status === "cancelled" ? "Cancelled" : "Pending"}
    </span>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface HistoryTableProps {
  history:   PaginatedHistory | undefined;
  isLoading: boolean;
  isError:   boolean;
  page:      number;
  onPageChange: (page: number) => void;
  activeSkill: Skill | null;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

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

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 animate-pulse space-y-2">
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-border/60" />
        <div className="h-5 w-12 rounded-full bg-border/60" />
      </div>
      <div className="h-4 w-3/4 rounded bg-border/40" />
      <div className="h-3 w-1/2 rounded bg-border/30" />
    </div>
  );
}

// ── Mobile card for a single attempt ─────────────────────────────────────────

function AttemptCard({ item }: { item: PaginatedHistory["items"][number] }) {
  const isComplete = item.status === "complete";

  const inner = (
    <div
      className={[
        "rounded-xl border bg-surface px-4 py-3 flex items-center gap-3 transition-colors",
        isComplete
          ? "border-border hover:border-primary/30 hover:bg-white/[0.02] cursor-pointer"
          : "border-border/50 opacity-75",
      ].join(" ")}
    >
      {/* Left: skill + task info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <SkillBadge skill={item.skill} />
          <span className="text-[10px] text-subtle">· {timeAgo(item.created_at)}</span>
        </div>
        <p className="text-sm font-semibold text-foreground truncate">{item.task_title}</p>
        <p className="text-[10px] text-subtle">Task {item.task_number}</p>
      </div>

      {/* Right: unified state badge + arrow */}
      <div className="flex items-center gap-2 shrink-0">
        <AttemptStateBadge status={item.status} band={item.estimated_band} />
        {isComplete && <ArrowRight className="w-4 h-4 text-white/25" />}
      </div>
    </div>
  );

  if (isComplete) {
    return (
      <Link href={`/attempts/${item.attempt_id}/report`} aria-label={`View report for ${item.task_title}`}>
        {inner}
      </Link>
    );
  }
  return inner;
}


// ── Main component ─────────────────────────────────────────────────────────────

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
      <div className="space-y-4">
        {/* Mobile skeleton */}
        <div className="md:hidden space-y-2">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>

        {/* Desktop skeleton */}
        <div className="hidden md:block rounded-xl border border-border overflow-hidden shadow-card bg-surface">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-32">Date</TableHead>
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

      {/* ── Mobile: card list ─────────────────────────────────────────────── */}
      <div
        className={`md:hidden space-y-2 transition-opacity duration-200 ${
          isLoading ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        {items.map((item) => (
          <AttemptCard key={item.attempt_id} item={item} />
        ))}
      </div>

      {/* ── Desktop: data table ───────────────────────────────────────────── */}
      <div
        className={`hidden md:block rounded-xl border border-border overflow-hidden shadow-card bg-surface transition-opacity duration-200 ${
          isLoading ? "opacity-60 pointer-events-none" : "opacity-100"
        }`}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="w-32">Date</TableHead>
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
                {/* Date */}
                <TableCell className="text-sm text-subtle">
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
                    <span className="text-xs text-subtle">Task {item.task_number}</span>
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

                {/* Report link */}
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

      <PaginationFooter
        page={page}
        totalPages={totalPages}
        total={total}
        start={start}
        end={end}
        has_next={has_next}
        isLoading={isLoading}
        itemLabel="attempt"
        onPageChange={onPageChange}
      />
    </div>
  );
}
