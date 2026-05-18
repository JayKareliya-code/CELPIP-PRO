"use client";

// ─────────────────────────────────────────────────────────────────────────────
// HistoryPage.tsx — History page with Practice + Mock Exam tabs
// ─────────────────────────────────────────────────────────────────────────────

import { useState }                    from "react";
import { History, BookOpen, ClipboardList, type LucideIcon } from "lucide-react";
import { PageWrapper }                 from "@/components/layout/PageWrapper";
import { useHistory }                  from "@/lib/hooks/useHistory";
import { HistoryFilterBar }            from "./HistoryFilterBar";
import { HistoryTable }                from "./HistoryTable";
import { MockExamHistorySection }      from "./MockExamHistorySection";
import type { Skill, PaginatedHistory } from "@/lib/types";

// ── View mode ─────────────────────────────────────────────────────────────────

type ViewMode = "practice" | "mock";

const VIEW_TABS: { label: string; value: ViewMode; icon: LucideIcon }[] = [
  { label: "Practice",    value: "practice", icon: BookOpen      },
  { label: "Mock Exams",  value: "mock",     icon: ClipboardList },
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
          className="grid grid-cols-2 gap-1 sm:inline-grid rounded-xl border border-border bg-surface p-1"
        >
          {VIEW_TABS.map(({ label, value, icon: Icon }) => {
            const isActive = view === value;
            return (
              <button
                key={value}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleViewChange(value)}
                className={[
                  "flex items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium",
                  "transition-colors duration-150 whitespace-nowrap",
                  isActive
                    ? "bg-white/[0.06] border border-white/10 text-white shadow-sm"
                    : "border border-transparent text-white/45 hover:text-white/80 hover:bg-white/[0.03]",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "h-3.5 w-3.5 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-white/35",
                  ].join(" ")}
                />
                {label}
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
          className="rounded-xl border border-border bg-surface px-3 py-2.5 sm:px-4 sm:py-3 text-center shadow-card"
        >
          <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums">{value}</p>
          <p className="text-xs text-subtle mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}
