"use client";

// ─────────────────────────────────────────────────────────────────────────────
// HistoryPage.tsx — Full history page shell
//
// Owns: skill filter state + pagination state
// Delegates: data fetching to useHistory hook, rendering to HistoryTable
// ─────────────────────────────────────────────────────────────────────────────

import { useState }            from "react";
import { History }             from "lucide-react";
import { useHistory }          from "@/lib/hooks/useHistory";
import { HistoryFilterBar }    from "./HistoryFilterBar";
import { HistoryTable }        from "./HistoryTable";
import type { Skill }          from "@/lib/types";

export function HistoryPage() {
  const [skill, setSkill] = useState<Skill | null>(null);
  const [page,  setPage]  = useState(1);

  // Reset to page 1 whenever the skill filter changes
  function handleSkillChange(s: Skill | null) {
    setSkill(s);
    setPage(1);
  }

  const { history, isLoading, isError } = useHistory(skill, page);

  return (
    <div className="mx-auto max-w-5xl w-full px-4 py-8 space-y-6 animate-fade-in">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Practice History
            </h1>
          </div>
          <p className="text-sm text-subtle">
            Review your past attempts, scores, and AI feedback.
          </p>
        </div>

        {/* Skill filter */}
        <HistoryFilterBar active={skill} onChange={handleSkillChange} />
      </div>

      {/* Summary stats bar — only shown when history is loaded */}
      {history && history.total > 0 && (
        <StatsSummary history={history} />
      )}

      {/* History table */}
      <HistoryTable
        history={history}
        isLoading={isLoading}
        isError={isError}
        page={page}
        onPageChange={setPage}
        activeSkill={skill}
      />
    </div>
  );
}

// ── Stats summary strip ────────────────────────────────────────────────────────

import type { PaginatedHistory } from "@/lib/types";

function StatsSummary({ history }: { history: PaginatedHistory }) {
  const completed = history.items.filter((a) => a.status === "complete");
  const bands     = completed
    .map((a) => a.estimated_band)
    .filter((b): b is number => b !== null && b !== undefined);
  const avgBand   = bands.length
    ? (bands.reduce((s, b) => s + b, 0) / bands.length).toFixed(1)
    : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Total Attempts", value: history.total },
        { label: "Completed",      value: completed.length },
        { label: "Avg. Band",      value: avgBand ?? "—" },
        {
          label: "Best Band",
          value: bands.length ? Math.max(...bands).toFixed(1) : "—",
        },
      ].map(({ label, value }) => (
        <div
          key={label}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-center shadow-card"
        >
          <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
          <p className="text-xs text-subtle mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}
