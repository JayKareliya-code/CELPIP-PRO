"use client";

// ─────────────────────────────────────────────────────────────────────────────
// HistoryPage.tsx — History page with Practice + Mock Exam tabs
// ─────────────────────────────────────────────────────────────────────────────

import { useState }                    from "react";
import { History }                     from "lucide-react";
import { PageWrapper }                 from "@/components/layout/PageWrapper";
import { useHistory }                  from "@/lib/hooks/useHistory";
import { HistoryFilterBar }            from "./HistoryFilterBar";
import { HistoryTable }                from "./HistoryTable";
import { MockExamHistorySection }      from "./MockExamHistorySection";
import type { Skill, PaginatedHistory } from "@/lib/types";

// ── View mode ─────────────────────────────────────────────────────────────────

type ViewMode = "practice" | "mock";

const VIEW_TABS: { label: string; value: ViewMode; icon: string }[] = [
  { label: "Practice",    value: "practice", icon: "🎤" },
  { label: "Mock Exams",  value: "mock",     icon: "📋" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export function HistoryPage() {
  const [view,  setView]  = useState<ViewMode>("practice");
  const [skill, setSkill] = useState<Skill | null>(null);
  const [page,  setPage]  = useState(1);

  function handleSkillChange(s: Skill | null) { setSkill(s); setPage(1); }
  function handleViewChange(v: ViewMode)      { setView(v); setPage(1); setSkill(null); }

  const { history, isLoading, isError } = useHistory(
    view === "practice" ? skill : null,
    view === "practice" ? page  : 1,
  );

  return (
    <PageWrapper>
      <div className="space-y-6 animate-fade-in">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              History
            </h1>
          </div>
          <p className="text-sm text-subtle">
            Review your past attempts, scores, and AI feedback.
          </p>
        </div>

        {/* ── View toggle (Practice / Mock Exams) ── */}
        <div
          role="tablist"
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1"
        >
          {VIEW_TABS.map(({ label, value, icon }) => {
            const isActive = view === value;
            return (
              <button
                key={value}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleViewChange(value)}
                className={`
                  flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium
                  transition-all duration-150
                  ${isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-subtle hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <span>{icon}</span> {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Practice view ────────────────────────────────────────────────── */}
      {view === "practice" && (
        <>
          {/* Skill filter + stats */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <HistoryFilterBar active={skill} onChange={handleSkillChange} />
          </div>

          {history && history.total > 0 && (
            <StatsSummary history={history} />
          )}

          <HistoryTable
            history={history}
            isLoading={isLoading}
            isError={isError}
            page={page}
            onPageChange={setPage}
            activeSkill={skill}
          />
        </>
      )}

      {/* ── Mock exams view ───────────────────────────────────────────────── */}
      {view === "mock" && <MockExamHistorySection />}

      </div>
    </PageWrapper>
  );
}

// ── Stats summary strip ────────────────────────────────────────────────────────

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
