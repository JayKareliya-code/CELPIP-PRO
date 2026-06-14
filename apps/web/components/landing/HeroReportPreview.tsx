"use client";

// ─────────────────────────────────────────────────────────────────────────────
// HeroReportPreview — the hero's live-feel AI report card. On mount the band
// gauge fills and counts up, and the dimension bars animate to their values.
// Honours prefers-reduced-motion (renders the final state, no animation).
// Sample data only — illustrative, never a real result.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Sparkles, RotateCcw, FileText } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { BAND_LABELS } from "@/lib/constants";

const R = 80;
const C = 2 * Math.PI * R;
const ARC = 0.75 * C; // 270° track
const BAND = 10.0;
const MAX = 12;
const BAND_LABEL = BAND_LABELS[BAND] ?? "";
const TARGET_FILL = (BAND / MAX) * ARC;

const DIMENSIONS = [
  { label: "Content & Coherence", pct: 90 },
  { label: "Vocabulary", pct: 76 },
  { label: "Listenability", pct: 84 },
  { label: "Task Fulfillment", pct: 92 },
];
const ZERO = DIMENSIONS.map(() => 0);

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function HeroReportPreview() {
  const reduced = usePrefersReducedMotion();
  const [fill, setFill] = useState(0);
  const [num, setNum] = useState(0);
  const [bars, setBars] = useState<number[]>(ZERO);

  useEffect(() => {
    if (reduced) {
      setFill(TARGET_FILL);
      setNum(BAND);
      setBars(DIMENSIONS.map((d) => d.pct));
      return;
    }

    let raf = 0;
    let startTs = 0;
    const duration = 1200;
    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const t = Math.min(1, (ts - startTs) / duration);
      const e = easeOutCubic(t);
      setFill(TARGET_FILL * e);
      setNum(BAND * e);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Bars transition via CSS once switched off zero.
    const barTimer = setTimeout(() => setBars(DIMENSIONS.map((d) => d.pct)), 80);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(barTimer);
    };
  }, [reduced]);

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      {/* soft glow behind the card */}
      <div
        aria-hidden
        className="absolute -inset-6 bg-gradient-to-tr from-emerald-500/15 via-primary/[0.05] to-transparent blur-3xl"
      />

      {/* main report card */}
      <div className="relative rounded-2xl border border-white/[0.12] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.8)] sm:p-7">
        {/* illustrative label — this is sample data, not a real result */}
        <span className="absolute -top-3 right-4 z-10 rounded-full border border-white/10 bg-[#0c0c0c] px-2.5 py-1 text-[10px] font-medium text-white/45">
          Sample report · illustrative
        </span>

        {/* header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/15">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-white/90">AI Feedback Report</p>
              <p className="text-[11px] text-white/40">Speaking · Task 4</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
            Scored
          </span>
        </div>

        {/* gauge + band */}
        <div className="mb-7 flex items-center gap-5">
          <div className="relative flex flex-shrink-0 items-center justify-center" style={{ width: 132, height: 120 }}>
            <svg width="132" height="120" viewBox="0 0 180 180" className="absolute inset-0">
              <circle
                cx="90" cy="90" r={R} fill="none" stroke="#252836" strokeWidth="12"
                strokeLinecap="round" strokeDasharray={`${ARC} ${C}`}
                transform="rotate(135 90 90)"
              />
              <circle
                cx="90" cy="90" r={R} fill="none" stroke="#34D399" strokeWidth="12"
                strokeLinecap="round" strokeDasharray={`${fill} ${C}`}
                transform="rotate(135 90 90)"
              />
            </svg>
            <div className="relative flex flex-col items-center">
              <span className="text-4xl font-extrabold leading-none tabular-nums text-emerald-400">
                {num.toFixed(1)}
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-white/30">/ 12</span>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
              Estimated Band
            </p>
            <p className="mt-1 text-lg font-bold text-white/90">{BAND_LABEL}</p>
            <p className="mt-0.5 text-xs text-white/55">Strong, well-developed response</p>
          </div>
        </div>

        {/* dimension bars */}
        <div className="space-y-3.5">
          {DIMENSIONS.map((d, i) => (
            <div key={d.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-white/60">{d.label}</span>
                <span className="text-xs font-semibold tabular-nums text-white/80">{d.pct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover transition-[width] duration-700 ease-out"
                  style={{ width: `${bars[i]}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* footer chips */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/[0.08] pt-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            <RotateCcw className="h-3 w-3" />
            70 retry credits
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/55">
            <FileText className="h-3 w-3" />
            Sample response
          </span>
        </div>
      </div>
    </div>
  );
}
