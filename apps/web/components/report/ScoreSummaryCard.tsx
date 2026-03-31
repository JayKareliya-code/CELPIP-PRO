"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ScoreSummaryCard.tsx — Overall band score with SVG arc gauge
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import type { Skill } from "@/lib/types";

interface Props {
  estimatedBand: number;
  skill: Skill;
  taskTitle: string;
  completedAt: string;
}

/** Returns Tailwind colour classes keyed by band range */
function bandPalette(band: number): { text: string; stroke: string; bg: string; badge: string } {
  if (band >= 9)  return { text: "text-emerald-400", stroke: "#34D399", bg: "bg-emerald-400/10", badge: "bg-emerald-400/20 text-emerald-300 border-emerald-500/30" };
  if (band >= 6)  return { text: "text-amber-400",   stroke: "#FBBF24", bg: "bg-amber-400/10",   badge: "bg-amber-400/20   text-amber-300   border-amber-500/30"   };
  return           { text: "text-rose-400",    stroke: "#F87171", bg: "bg-rose-400/10",    badge: "bg-rose-400/20    text-rose-300    border-rose-500/30"    };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function ScoreSummaryCard({ estimatedBand, skill, taskTitle, completedAt }: Props) {
  const palette = bandPalette(estimatedBand);
  const [animated, setAnimated] = useState(0);
  const animRef = useRef<number | null>(null);

  // Animate band number counting up on mount
  useEffect(() => {
    const start = performance.now();
    const duration = 1000;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimated(eased * estimatedBand);
      if (progress < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [estimatedBand]);

  // SVG arc gauge
  const radius      = 60;
  const circumference = 2 * Math.PI * radius;
  const arcRatio    = (estimatedBand / 12) * 0.75; // 75% of circle = full scale
  const dashOffset  = circumference * (1 - arcRatio);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-panel">
      {/* Ambient glow */}
      <div className={`absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl opacity-20 ${palette.bg}`} />

      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
        {/* SVG Arc Gauge */}
        <div className="relative flex-shrink-0">
          <svg width="152" height="152" viewBox="0 0 152 152" className="-rotate-[135deg]">
            {/* Track */}
            <circle
              cx="76" cy="76" r={radius}
              fill="none" stroke="#252836" strokeWidth="10"
              strokeDasharray={circumference * 0.75}
              strokeDashoffset="0"
              strokeLinecap="round"
            />
            {/* Progress */}
            <circle
              cx="76" cy="76" r={radius}
              fill="none" stroke={palette.stroke} strokeWidth="10"
              strokeDasharray={circumference * 0.75}
              strokeDashoffset={circumference * 0.75 * (1 - animated / 12)}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.05s linear", filter: `drop-shadow(0 0 6px ${palette.stroke}80)` }}
            />
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold tabular-nums ${palette.text}`}>
              {animated.toFixed(1)}
            </span>
            <span className="text-xs text-subtle uppercase tracking-widest mt-0.5">/ 12</span>
          </div>
        </div>

        {/* Text info */}
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${palette.badge}`}>
            {skill === "speaking" ? "🎤" : "✍️"} {skill.charAt(0).toUpperCase() + skill.slice(1)}
          </div>
          <h2 className="text-xl font-semibold text-white leading-snug">{taskTitle}</h2>
          <p className="text-sm text-subtle">Completed {formatDate(completedAt)}</p>

          {/* Band label */}
          <div className={`mt-3 rounded-xl px-4 py-2 text-sm font-medium ${palette.bg} ${palette.text} border border-current/20`}>
            {estimatedBand >= 9
              ? "🏆 Excellent — Band " + estimatedBand.toFixed(1)
              : estimatedBand >= 6
              ? "✅ Competent — Band " + estimatedBand.toFixed(1)
              : "📈 Developing — Band " + estimatedBand.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
}
