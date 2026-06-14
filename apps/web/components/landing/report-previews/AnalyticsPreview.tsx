// ─────────────────────────────────────────────────────────────────────────────
// AnalyticsPreview — static replica of components/report/TranscriptAnalysisCard.tsx
// (the 2×2 speech-analytics metric grid). Sample data only — illustrative.
// ─────────────────────────────────────────────────────────────────────────────
import { BarChart2 } from "lucide-react";

interface Metric {
  label: string;
  value: string;
  unit?: string;
  detail: string;
  pct: number;
  bar: string;
  insight: string;
  insightColor: string;
}

const METRICS: Metric[] = [
  { label: "Speaking Pace", value: "142", unit: "wpm", detail: "Ideal range 130–160", pct: 80, bar: "bg-emerald-400", insight: "Natural, easy-to-follow pace.", insightColor: "text-emerald-400" },
  { label: "Vocabulary", value: "68", unit: "%", detail: "Type-token ratio", pct: 68, bar: "bg-amber-400", insight: "Solid range — push for more variety.", insightColor: "text-amber-400" },
  { label: "Words Spoken", value: "96", detail: "Across 7 sentences", pct: 75, bar: "bg-emerald-400", insight: "Full, complete response.", insightColor: "text-emerald-400" },
  { label: "Sentence Variety", value: "74", unit: "%", detail: "Mixed sentence lengths", pct: 74, bar: "bg-emerald-400", insight: "Good structural variety.", insightColor: "text-emerald-400" },
];

export function AnalyticsPreview() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-panel">
      <div className="flex items-center gap-2">
        <BarChart2 className="h-4 w-4 text-white/40" />
        <span className="text-xs font-bold uppercase tracking-wider text-white/40">Speech Analytics</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {METRICS.map((m) => (
          <div key={m.label} className="flex flex-col gap-2 rounded-xl border border-border bg-white/[0.02] p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{m.label}</span>
            <span className="text-2xl font-bold tabular-nums text-white/90">
              {m.value}
              {m.unit && <span className="ml-0.5 text-xs font-normal text-white/30">{m.unit}</span>}
            </span>
            <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${m.pct}%` }} />
            </div>
            <span className="text-[11px] text-white/30">{m.detail}</span>
            <span className={`text-xs leading-relaxed ${m.insightColor}`}>{m.insight}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
