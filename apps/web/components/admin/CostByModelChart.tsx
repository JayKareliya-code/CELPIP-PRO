"use client";

// ─────────────────────────────────────────────────────────────────────────────
// CostByModelChart.tsx — Recharts bar chart used by the admin cost report.
//
// Extracted into its own module so the ~95 KB-gz `recharts` import lives in
// a chunk only loaded when the cost-report page renders. Without this, the
// chart's recharts subtree ends up in any chunk shared with the admin layout
// — paying for it on pages that never show a chart.
//
// Consumed via next/dynamic in app/admin/cost-report/page.tsx with ssr=false.
// ─────────────────────────────────────────────────────────────────────────────

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface CostByModelChartProps {
  data:    { model: string; usd: number }[];
  colors:  readonly string[];
  /** Currency formatter — keeps formatting consistent with the page tables. */
  format:  (usd: number) => string;
}

export default function CostByModelChart({ data, colors, format }: CostByModelChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="model"
          tick={{ fontSize: 11, fill: "var(--color-subtle)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `$${v.toFixed(3)}`}
          tick={{ fontSize: 11, fill: "var(--color-subtle)" }}
          axisLine={false}
          tickLine={false}
          width={64}
        />
        <Tooltip
          formatter={(v: number) => [format(v), "Est. USD"]}
          contentStyle={{
            background:   "var(--color-surface)",
            border:       "1px solid var(--color-border)",
            borderRadius: "8px",
            fontSize:     "12px",
          }}
        />
        <Bar dataKey="usd" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
