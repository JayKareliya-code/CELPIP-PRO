"use client";

/**
 * Admin — AI Cost Report page
 * Route: /admin/cost-report
 *
 * Shows aggregated AI spend broken down by model and by user.
 * Fetches GET /api/v1/admin/cost-report via the shared apiFetch helper
 * (respects NEXT_PUBLIC_API_URL — defaults to http://localhost:8000).
 */

import { useState, useCallback } from "react";
import { Navbar }        from "@/components/layout/Navbar";
import { Footer }        from "@/components/layout/Footer";
import { AdminSidebar }  from "@/components/admin/AdminSidebar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  DollarSign, Users, TrendingUp, AlertCircle, RefreshCw, ChevronUp, ChevronDown,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch, authHeaders, API_V1 } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CostReportUser {
  user_id: string;
  email: string;
  plan: string;
  total_tokens: number;
  total_usd: number;
}

interface CostReport {
  period: { from: string; to: string };
  total_usd: number;
  by_model: Record<string, number>;
  by_operation: Record<string, number>;
  by_user: CostReportUser[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function iso30dAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

const PLAN_BADGE: Record<string, string> = {
  starter: "bg-zinc-500/15 text-zinc-400",
  pro:     "bg-amber-500/15 text-amber-400",
  ultra:   "bg-violet-500/15 text-violet-400",
};

const CHART_COLORS = [
  "#f59e0b", "#8b5cf6", "#06b6d4", "#10b981", "#f43f5e", "#64748b",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon, label, value, sub,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 flex items-start gap-4 shadow-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-subtle font-medium mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-subtle/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

type SortKey = "email" | "plan" | "total_tokens" | "total_usd";

function UserTable({ users }: { users: CostReportUser[] }) {
  const [sortKey, setSortKey]   = useState<SortKey>("total_usd");
  const [sortAsc, setSortAsc]   = useState(false);

  const toggle = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...users].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortAsc ? cmp : -cmp;
  });

  const ColHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-subtle cursor-pointer
                 select-none hover:text-foreground transition-colors"
      onClick={() => toggle(k)}
      aria-sort={sortKey === k ? (sortAsc ? "ascending" : "descending") : "none"}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === k
          ? sortAsc
            ? <ChevronUp className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3 opacity-25" />}
      </span>
    </th>
  );

  if (users.length === 0) {
    return (
      <p className="text-sm text-subtle text-center py-8">
        No users found for this period.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm" aria-label="Users by AI spend">
        <thead className="bg-muted">
          <tr>
            <ColHeader k="email"        label="User" />
            <ColHeader k="plan"         label="Plan" />
            <ColHeader k="total_tokens" label="Tokens" />
            <ColHeader k="total_usd"    label="Est. USD" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {sorted.map(u => (
            <tr key={u.user_id} className="hover:bg-muted/40 transition-colors">
              <td className="px-4 py-3 text-foreground font-medium truncate max-w-[240px]" title={u.email}>
                {u.email}
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                  PLAN_BADGE[u.plan] ?? "bg-zinc-500/15 text-zinc-400",
                )}>
                  {u.plan}
                </span>
              </td>
              <td className="px-4 py-3 text-subtle tabular-nums">
                {fmtTokens(u.total_tokens)}
              </td>
              <td className="px-4 py-3 text-foreground tabular-nums font-medium">
                {fmt(u.total_usd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CostReportPage() {
  const { getToken } = useAuth();

  const [fromDate, setFromDate] = useState(iso30dAgo());
  const [toDate,   setToDate]   = useState(isoToday());
  const [report,   setReport]   = useState<CostReport | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const params = new URLSearchParams({ from: fromDate, to: toDate });
      const data = await apiFetch<CostReport>(
        `${API_V1}/admin/cost-report?${params}`,
        { headers: authHeaders(token) },
      );
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, getToken]);

  // Convert by_model to chart data
  const chartData = report
    ? Object.entries(report.by_model)
        .map(([model, usd]) => ({ model, usd }))
        .sort((a, b) => b.usd - a.usd)
    : [];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />

        <main className="flex-1 overflow-auto bg-muted px-6 py-8 space-y-8 max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Cost Report</h1>
              <p className="text-sm text-subtle mt-1">
                Aggregated spend from <code className="text-xs bg-muted px-1 py-0.5 rounded">ai_cost_log</code> — estimates only, not used for billing.
              </p>
            </div>

            {/* Date range + fetch */}
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-subtle">From</span>
                <input
                  id="cost-report-from"
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  max={toDate}
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-subtle">To</span>
                <input
                  id="cost-report-to"
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  min={fromDate}
                  max={isoToday()}
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <button
                id="cost-report-fetch-btn"
                onClick={fetchReport}
                disabled={loading}
                className={cn(
                  "h-9 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                {loading ? "Loading…" : "Fetch"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Empty state */}
          {!report && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-subtle gap-3">
              <DollarSign className="w-10 h-10 opacity-20" />
              <p className="text-sm">Choose a date range and click <strong>Fetch</strong> to load the report.</p>
            </div>
          )}

          {report && (
            <>
              {/* Summary cards */}
              <section aria-label="Cost summary">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle mb-3">
                  Summary · {report.period.from} → {report.period.to}
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <SummaryCard icon={DollarSign}   label="Total estimated USD"      value={fmt(report.total_usd)} />
                  <SummaryCard icon={Users}         label="Users with spend"         value={String(report.by_user.length)} />
                  <SummaryCard
                    icon={TrendingUp}
                    label="Top model by spend"
                    value={chartData[0]?.model ?? "—"}
                    sub={chartData[0] ? fmt(chartData[0].usd) : undefined}
                  />
                </div>
              </section>

              {/* Bar chart — by model */}
              {chartData.length > 0 && (
                <section aria-label="Spend by model">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle mb-4">
                    Spend by Model
                  </h2>
                  <div className="bg-surface rounded-xl border border-border p-5 shadow-card">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                          dataKey="model"
                          tick={{ fontSize: 11, fill: "var(--color-subtle)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={v => `$${v.toFixed(3)}`}
                          tick={{ fontSize: 11, fill: "var(--color-subtle)" }}
                          axisLine={false}
                          tickLine={false}
                          width={64}
                        />
                        <Tooltip
                          formatter={(v: number) => [fmt(v), "Est. USD"]}
                          contentStyle={{
                            background: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="usd" radius={[4, 4, 0, 0]}>
                          {chartData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}

              {/* Operation breakdown */}
              {Object.keys(report.by_operation).length > 0 && (
                <section aria-label="Spend by operation">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle mb-3">
                    Spend by Operation
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(report.by_operation)
                      .sort(([, a], [, b]) => b - a)
                      .map(([op, usd]) => (
                        <div
                          key={op}
                          className="bg-surface rounded-lg border border-border px-4 py-3 flex items-center gap-3 shadow-card"
                        >
                          <span className="text-sm font-medium text-foreground capitalize">{op}</span>
                          <span className="text-sm text-subtle tabular-nums">{fmt(usd)}</span>
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {/* User table */}
              <section aria-label="Top users by spend">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle mb-3">
                  Top Users by Spend
                </h2>
                <UserTable users={report.by_user} />
              </section>
            </>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}
