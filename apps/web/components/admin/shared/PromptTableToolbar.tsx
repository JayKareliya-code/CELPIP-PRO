"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/admin/shared/PromptTableToolbar.tsx
//
// Professional filter bar rendered above each per-task prompt table.
// All filtering is client-side; the parent passes down filter state and handlers.
//
// Features:
//   • Live text search (title + prompt_text)
//   • Status segmented chips: All / Draft / Published / Archived
//   • Active/Inactive toggle chips
//   • Optional Pool chips: Practice / Mock  (Speaking only)
//   • Live result count: "{filtered} of {total} prompts"
//   • "Clear filters" button — appears only when any filter is active
// ─────────────────────────────────────────────────────────────────────────────

import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type StatusFilter = "all" | "draft" | "published" | "archived";
export type ActiveFilter = "all" | "active" | "inactive";
export type PoolFilter   = "all" | "practice" | "mock";

export interface PromptTableToolbarProps {
  // Search
  search:    string;
  onSearch:  (v: string) => void;

  // Status filter
  status:    StatusFilter;
  onStatus:  (v: StatusFilter) => void;

  // Active filter
  active:    ActiveFilter;
  onActive:  (v: ActiveFilter) => void;

  // Pool filter — Speaking only; omit for Writing
  pool?:     PoolFilter;
  onPool?:   (v: PoolFilter) => void;

  // Counts
  total:    number;
  filtered: number;

  // Reset
  onClear:  () => void;
}

// ── Chip component ────────────────────────────────────────────────────────────

interface ChipProps<T extends string> {
  label:    string;
  value:    T;
  current:  T;
  onClick:  (v: T) => void;
  variant?: "status" | "active" | "pool";
}

const CHIP_ACTIVE_VARIANTS: Record<string, string> = {
  status: "bg-primary text-white border-primary shadow-sm",
  active: "bg-primary text-white border-primary shadow-sm",
  pool:   "bg-primary text-white border-primary shadow-sm",
};

function Chip<T extends string>({ label, value, current, onClick, variant = "status" }: ChipProps<T>) {
  const isActive = value === current;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 whitespace-nowrap select-none",
        isActive
          ? CHIP_ACTIVE_VARIANTS[variant]
          : "bg-surface text-subtle border-border hover:border-primary/40 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

// ── Status chip definitions ───────────────────────────────────────────────────

const STATUS_CHIPS: { label: string; value: StatusFilter }[] = [
  { label: "All",       value: "all"       },
  { label: "Draft",     value: "draft"     },
  { label: "Published", value: "published" },
  { label: "Archived",  value: "archived"  },
];

const ACTIVE_CHIPS: { label: string; value: ActiveFilter }[] = [
  { label: "All",      value: "all"      },
  { label: "Active",   value: "active"   },
  { label: "Inactive", value: "inactive" },
];

const POOL_CHIPS: { label: string; value: PoolFilter }[] = [
  { label: "All",      value: "all"      },
  { label: "Practice", value: "practice" },
  { label: "Mock",     value: "mock"     },
];

// ── Main component ────────────────────────────────────────────────────────────

export function PromptTableToolbar({
  search, onSearch,
  status, onStatus,
  active, onActive,
  pool,   onPool,
  total, filtered,
  onClear,
}: PromptTableToolbarProps) {
  const hasFilters =
    search !== "" ||
    status !== "all" ||
    active !== "all" ||
    (pool !== undefined && pool !== "all");

  const isFiltered = filtered !== total;

  return (
    <div className="rounded-xl border border-border bg-surface shadow-card">
      {/* ── Top row: search + counts + clear ───────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle pointer-events-none" />
          <input
            id="prompt-table-search"
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by title or prompt text…"
            className={cn(
              "w-full pl-8 pr-4 py-1.5 rounded-lg text-sm",
              "bg-muted border border-border text-foreground placeholder:text-subtle",
              "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60",
              "transition-all duration-150",
            )}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Result count */}
        <span className="shrink-0 text-xs tabular-nums text-subtle font-medium">
          {isFiltered ? (
            <>
              <span className="text-foreground font-semibold">{filtered}</span>
              <span> of {total}</span>
            </>
          ) : (
            <span className="text-foreground font-semibold">{total}</span>
          )}
          {" "}{total === 1 && !isFiltered ? "prompt" : "prompts"}
        </span>

        {/* Clear filters */}
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
              "text-xs font-semibold text-subtle border border-border",
              "hover:text-foreground hover:border-primary/40 transition-all duration-150",
            )}
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* ── Bottom row: filter chips ────────────────────────────────────────── */}
      <div className="flex items-center flex-wrap gap-x-5 gap-y-2 px-4 py-2.5">

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-subtle uppercase tracking-wider mr-0.5">
            Status
          </span>
          {STATUS_CHIPS.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              value={c.value}
              current={status}
              onClick={onStatus}
              variant="status"
            />
          ))}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border hidden sm:block" />

        {/* Active */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-subtle uppercase tracking-wider mr-0.5">
            Active
          </span>
          {ACTIVE_CHIPS.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              value={c.value}
              current={active}
              onClick={onActive}
              variant="active"
            />
          ))}
        </div>

        {/* Pool — Speaking only */}
        {pool !== undefined && onPool && (
          <>
            {/* Divider */}
            <div className="h-5 w-px bg-border hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-subtle uppercase tracking-wider mr-0.5">
                Pool
              </span>
              {POOL_CHIPS.map((c) => (
                <Chip
                  key={c.value}
                  label={c.label}
                  value={c.value}
                  current={pool}
                  onClick={onPool}
                  variant="pool"
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
