// ─────────────────────────────────────────────────────────────────────────────
// components/common/PaginationFooter.tsx — Shared pagination control
//
// Used by HistoryTable (practice attempts) and MockExamHistorySection.
// ─────────────────────────────────────────────────────────────────────────────

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface PaginationFooterProps {
  page:         number;
  totalPages:   number;
  total:        number;
  start:        number;
  end:          number;
  has_next:     boolean;
  isLoading:    boolean;
  itemLabel?:   string; // e.g. "attempt" | "session"
  onPageChange: (page: number) => void;
}

export function PaginationFooter({
  page,
  totalPages,
  total,
  start,
  end,
  has_next,
  isLoading,
  itemLabel = "item",
  onPageChange,
}: PaginationFooterProps) {
  return (
    <div className="flex items-center justify-between text-sm text-subtle">
      <span>
        Showing {start}–{end} of {total} {itemLabel}{total !== 1 ? "s" : ""}
      </span>

      <div className="flex items-center gap-2">
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}

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
  );
}
