"use client";

import { useId, useState, useEffect } from "react";
import { useTaskScoreHistory }       from "@/lib/hooks/useTaskScoreHistory";
import { formatBand, roundBand }     from "@/lib/utils";
import type { Skill, ReportDimensionScore, TaskScorePoint } from "@/lib/types";

interface Props {
  currentBand:       number;
  skill:             Skill;
  taskNumber:        number;
  currentAttemptId:  string;
  currentDimensions: ReportDimensionScore[];
}

function deltaLabel(delta: number) { return `${delta > 0 ? "+" : ""}${formatBand(delta)}`; }
function deltaPalette(delta: number) {
  if (delta > 0) return { text: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-500/30", arrow: "↑" };
  if (delta < 0) return { text: "text-rose-400",    bg: "bg-rose-400/10",    border: "border-rose-500/30",    arrow: "↓" };
  return              { text: "text-white/40",    bg: "bg-white/[0.05]",  border: "border-white/10",       arrow: "→" };
}
function coachingMessage(delta: number, streak: number) {
  if (delta > 1)    return `Great leap! You improved by ${formatBand(delta)} bands.`;
  if (delta > 0)    return streak >= 2 ? `${streak} attempts in a row — keep the momentum!` : `Good progress — up ${formatBand(delta)} from last time.`;
  if (delta < -0.5) return "Score dipped. Review your weaknesses and try again.";
  if (delta < 0)    return "Slight dip — consistency matters. Keep going.";
  return "Same as last time. Target one weakness to push higher.";
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

// ── Sparkline: SVG for path/fill only, HTML for dots+tooltips ────────────────

function Sparkline({ scores, currentAttemptId }: { scores: TaskScorePoint[]; currentAttemptId: string }) {
  const uid        = useId();
  const gradId     = `sg-${uid.replace(/:/g, "")}`;
  const [hov, setHov] = useState<number | null>(null);

  if (scores.length < 2) return null;

  const vals   = scores.map(s => roundBand(s.estimated_band));
  const minV   = Math.max(1,  Math.min(...vals) - 0.5);
  const maxV   = Math.min(12, Math.max(...vals) + 0.5);
  const range  = maxV - minV || 1;
  const W = 300; const H = 72;

  // SVG coords
  const svgX = (i: number) => scores.length === 1 ? W / 2 : (i / (scores.length - 1)) * W;
  const svgY = (v: number) => H - ((v - minV) / range) * H;

  const pts = vals.map((v, i): [number, number] => [svgX(i), svgY(v)]);

  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1]; const [cx, cy] = pts[i];
    const cpx = (px + cx) / 2;
    d += ` C ${cpx},${py} ${cpx},${cy} ${cx},${cy}`;
  }
  const last  = pts[pts.length - 1];
  const isUp  = vals[vals.length - 1] >= vals[vals.length - 2];
  const color = isUp ? "#34D399" : "#F87171";

  // Percentage positions for HTML elements (match SVG coordinate space)
  const xPct = (i: number) => (svgX(i) / W) * 100;
  const yPct = (v: number) => (svgY(v) / H) * 100;

  return (
    <div className="relative w-full" style={{ height: 72 }}>
      {/* Path + fill — stretch is fine for curves */}
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0"    />
          </linearGradient>
        </defs>
        <path d={`${d} L ${last[0]},${H} L ${pts[0][0]},${H} Z`} fill={`url(#${gradId})`} />
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* HTML dots — no SVG distortion */}
      {scores.map((s, i) => {
        const isCur = s.attempt_id === currentAttemptId;
        const isH   = hov === i;
        const size  = isCur ? 12 : isH ? 10 : 7;
        const bg    = isCur ? color : isH ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.28)";
        const glow  = isCur ? `0 0 8px ${color}80` : isH ? "0 0 6px rgba(255,255,255,0.35)" : "none";

        return (
          <div
            key={s.attempt_id}
            className="absolute z-10"
            style={{ left: `${xPct(i)}%`, top: `${yPct(vals[i])}%`, transform: "translate(-50%, -50%)" }}
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
          >
            {/* Tooltip */}
            {isH && (
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none
                              bg-[#141620] border border-white/[0.12] rounded-xl px-3 py-2 shadow-2xl whitespace-nowrap">
                <p className="text-[11px] font-bold tabular-nums" style={{ color }}>
                  Band {formatBand(vals[i])}{isCur ? " · This attempt" : ""}
                </p>
                <p className="text-[10px] text-white/40 mt-0.5">
                  {fmtDate(s.completed_at)} · #{i + 1}
                </p>
              </div>
            )}
            {/* Dot */}
            <div
              className="rounded-full cursor-pointer transition-all duration-150"
              style={{ width: size, height: size, backgroundColor: bg, boxShadow: glow }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ScoreProgressCard({ currentBand, skill, taskNumber, currentAttemptId, currentDimensions }: Props) {
  const { data, isLoading } = useTaskScoreHistory(skill, taskNumber);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5 animate-pulse">
        <div className="h-3 w-24 rounded bg-white/[0.06] mb-4" />
        <div className="h-16 rounded bg-white/[0.03]" />
      </div>
    );
  }
  if (!data || data.scores.length < 2) return null;

  const prevScores = data.scores.filter(s => s.attempt_id !== currentAttemptId);
  if (!prevScores.length) return null;

  const previousBand = roundBand(prevScores[prevScores.length - 1].estimated_band);
  const current      = roundBand(currentBand);
  const delta        = +(current - previousBand).toFixed(1);
  const palette      = deltaPalette(delta);

  let streak = 0;
  const pb = prevScores.map(s => roundBand(s.estimated_band));
  for (let i = pb.length - 1; i > 0; i--) { if (pb[i] >= pb[i - 1]) streak++; else break; }
  if (delta >= 0) streak++;

  const prevDims  = prevScores[prevScores.length - 1].dimensions ?? [];
  const dimDeltas = currentDimensions
    .filter(d => d.dimension)
    .map(curr => {
      const prev   = prevDims.find(p => p.dimension === curr.dimension);
      const dDelta = prev ? curr.score - prev.score : null;
      return { label: curr.label, score: curr.score, maxScore: curr.max_score, delta: dDelta };
    });

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-white/30">Score Trend</h2>
        <span className="text-[10px] text-white/20 tabular-nums">
          {data.scores.length} attempt{data.scores.length !== 1 ? "s" : ""} · Task {taskNumber}
        </span>
      </div>

      {/* ── Sparkline ─────────────────────────────────────────────────────── */}
      <div className="px-5 pb-2">
        <Sparkline scores={data.scores} currentAttemptId={currentAttemptId} />
      </div>

      {/* ── Attempt chips (scrollable row) ────────────────────────────────── */}
      <div className="flex gap-1.5 px-5 pb-4 overflow-x-auto no-scrollbar">
        {data.scores.map((s, i) => {
          const isCur  = s.attempt_id === currentAttemptId;
          const band   = roundBand(s.estimated_band);
          const isUp   = i > 0 && band > roundBand(data.scores[i - 1].estimated_band);
          const isDown = i > 0 && band < roundBand(data.scores[i - 1].estimated_band);
          return (
            <div
              key={s.attempt_id}
              className={`flex-shrink-0 flex flex-col items-center rounded-lg border px-2.5 py-1.5 transition-colors
                ${isCur
                  ? "border-white/20 bg-white/[0.07]"
                  : "border-white/[0.07] bg-transparent"}`}
            >
              <span className={`text-[10px] font-bold tabular-nums
                ${isCur ? "text-white/80" : isUp ? "text-emerald-400" : isDown ? "text-rose-400" : "text-white/45"}`}>
                {formatBand(band)}
              </span>
              <span className="text-[9px] text-white/25 mt-px">#{i + 1}</span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/[0.06] mx-5" />

      {/* ── Delta row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className={`flex items-center gap-1 rounded-xl border px-3 py-2 flex-shrink-0 ${palette.bg} ${palette.border}`}>
          <span className={`text-lg font-bold tabular-nums leading-none ${palette.text}`}>{deltaLabel(delta)}</span>
          <span className={`text-sm font-bold leading-none ${palette.text}`}>{palette.arrow}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-white/60 leading-snug">
            <span className="tabular-nums">{formatBand(previousBand)}</span>
            <span className="mx-1.5 text-white/20">→</span>
            <span className={`font-semibold tabular-nums ${palette.text}`}>{formatBand(current)}</span>
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">{coachingMessage(delta, streak)}</p>
        </div>
      </div>

      {/* ── Dimension comparison — matches DimensionBreakdown rubric card style ── */}
      {prevDims.length > 0 && dimDeltas.length > 0 && (
        <DimComparisonCards dimDeltas={dimDeltas} />
      )}
    </div>
  );
}

// ── Rubric-style dimension cards (matches DimensionBreakdown.tsx exactly) ────

type DimDelta = { label: string; score: number; maxScore: number; delta: number | null };

function scoreBarColor(score: number) {
  if (score >= 9) return "bg-emerald-400";
  if (score >= 6) return "bg-amber-400";
  return "bg-rose-400";
}
function scoreTextColor(score: number) {
  if (score >= 9) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-rose-400";
}
function scoreAccent(score: number) {
  if (score >= 9) return "bg-emerald-400/50";
  if (score >= 6) return "bg-amber-400/50";
  return "bg-rose-400/50";
}

function DimComparisonCards({ dimDeltas }: { dimDeltas: DimDelta[] }) {
  const [widths, setWidths] = useState<number[]>(dimDeltas.map(() => 0));

  useEffect(() => {
    const timers = dimDeltas.map((_, i) =>
      setTimeout(() => {
        setWidths(prev => {
          const next = [...prev];
          next[i] = (dimDeltas[i].score / dimDeltas[i].maxScore) * 100;
          return next;
        });
      }, i * 80)
    );
    return () => timers.forEach(clearTimeout);
  }, [dimDeltas]);

  return (
    <div className="border-t border-white/[0.06] px-5 pt-4 pb-5">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/25">
        vs Last Attempt
      </p>
      <div className="flex flex-col gap-2.5">
        {dimDeltas.map(({ label, score, maxScore, delta: d }, i) => {
          const pos = d !== null && d > 0;
          const neg = d !== null && d < 0;
          const deltaCls = pos
            ? "text-emerald-400 bg-emerald-400/10 border-emerald-500/25"
            : neg
            ? "text-rose-400 bg-rose-400/10 border-rose-500/25"
            : "text-white/30 bg-white/[0.04] border-white/10";

          return (
            <div
              key={label}
              className="relative rounded-xl border border-border/60 bg-white/[0.02] px-4 py-3.5 pl-5 flex flex-col gap-2.5 overflow-hidden animate-fade-in"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
            >
              {/* Left accent stripe — score colour */}
              <span className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${scoreAccent(score)}`} />

              {/* Label + delta badge inline */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white/85 leading-snug">{label}</span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums flex-shrink-0 ${deltaCls}`}>
                  {d === null ? "—" : d > 0 ? `+${d}` : `${d}`}
                </span>
              </div>

              {/* Bar + score */}
              <div className="flex items-center gap-3">
                <div className="h-0.5 w-1/4 rounded-full bg-white/[0.08] overflow-hidden flex-shrink-0">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${scoreBarColor(score)}`}
                    style={{ width: `${widths[i]}%` }}
                  />
                </div>
                <span className={`text-sm font-bold tabular-nums leading-none flex-shrink-0 ${scoreTextColor(score)}`}>
                  {score}
                  <span className="text-xs font-normal text-white/30 ml-0.5">/{maxScore}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
