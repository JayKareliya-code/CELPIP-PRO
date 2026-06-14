// ─────────────────────────────────────────────────────────────────────────────
// ScoreGaugePreview — static, presentational replica of the report's band-score
// gauge (mirrors components/report/ScoreSummaryCard.tsx). Sample data only:
// illustrative, never a real result. No hooks, safe to render anywhere.
// ─────────────────────────────────────────────────────────────────────────────
import { Mic } from "lucide-react";
import { BAND_LABELS } from "@/lib/constants";

const R = 80;
const C = 2 * Math.PI * R;          // full circumference
const ARC = 0.75 * C;               // 270° track arc
const BAND = 10.0;
const MAX = 12;
const FILL = (BAND / MAX) * ARC;    // filled portion of the arc

export function ScoreGaugePreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-panel">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl"
      />

      {/* header */}
      <div className="relative mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-400/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
          <Mic className="h-3 w-3" />
          Speaking · Task 4
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">
          Scored
        </span>
      </div>

      {/* gauge */}
      <div className="relative mx-auto flex items-center justify-center" style={{ width: 200, height: 180 }}>
        <svg width="200" height="180" viewBox="0 0 180 180" className="absolute inset-0">
          <circle
            cx="90" cy="90" r={R} fill="none" stroke="#252836" strokeWidth="10"
            strokeLinecap="round" strokeDasharray={`${ARC} ${C}`}
            transform="rotate(135 90 90)"
          />
          <circle
            cx="90" cy="90" r={R} fill="none" stroke="#34D399" strokeWidth="10"
            strokeLinecap="round" strokeDasharray={`${FILL} ${C}`}
            transform="rotate(135 90 90)"
          />
        </svg>
        <div className="relative flex flex-col items-center">
          <span className="text-5xl font-bold leading-none tabular-nums text-emerald-400">
            {BAND.toFixed(1)}
          </span>
          <span className="mt-1 text-xs font-medium text-white/30">/ 12</span>
        </div>
      </div>

      {/* label */}
      <div className="relative mt-3 flex items-center justify-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <p className="text-sm font-semibold text-white/85">
          {BAND_LABELS[BAND]} — Band {BAND.toFixed(1)}
        </p>
      </div>
    </div>
  );
}
