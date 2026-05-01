"use client";

import { useMemo }    from "react";
import { BarChart2 } from "lucide-react";

interface Props {
  transcript:    string;
  taskDurationS: number;
}




interface Stats {
  wordCount: number; uniqueWords: number; ttr: number;
  sentences: number; shortPct: number;
  estimatedWpm: number;
}

function analyse(text: string, durationS: number): Stats {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const unique = new Set(words);
  const ttr = wordCount > 0 ? unique.size / wordCount : 0;
  const rawSents = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const sentences = rawSents.length;
  const short = rawSents.filter(s => s.split(/\s+/).filter(Boolean).length < 9).length;
  const shortPct = sentences > 0 ? Math.round((short / sentences) * 100) : 0;
  return {
    wordCount, uniqueWords: unique.size, ttr,
    sentences, shortPct,
    estimatedWpm: durationS > 0 ? Math.round(wordCount / (durationS / 60)) : 0,
  };
}

// ── Signal helpers ────────────────────────────────────────────────────────────

type Signal = { insight: string; textColor: string; barColor: string; statusPct: number };

function wpmSignal(wpm: number): Signal {
  const statusPct = Math.min(100, Math.max(4, Math.round((wpm / 200) * 100)));
  if (wpm < 100)  return { insight: "Too slow — aim for 110–145 WPM to sound fluent.", textColor: "text-rose-400",    barColor: "bg-rose-400",    statusPct };
  if (wpm < 110)  return { insight: "Slightly slow — a more natural pace helps your fluency score.", textColor: "text-amber-400",   barColor: "bg-amber-400",   statusPct };
  if (wpm <= 145) return { insight: "Ideal pace — clear and natural for CELPIP examiners.", textColor: "text-emerald-400", barColor: "bg-emerald-400", statusPct };
  if (wpm <= 165) return { insight: "Slightly fast — slow down so examiners catch every word.", textColor: "text-amber-400",   barColor: "bg-amber-400",   statusPct };
  return           { insight: "Too fast — examiners may miss content. Aim to slow down.", textColor: "text-rose-400",    barColor: "bg-rose-400",    statusPct };
}

function ttrSignal(ttr: number): Signal {
  const statusPct = Math.round(ttr * 100);
  if (ttr >= 0.65) return { insight: "Excellent word variety — signals Band 9+ vocabulary range.", textColor: "text-emerald-400", barColor: "bg-emerald-400", statusPct };
  if (ttr >= 0.50) return { insight: "Good variety — practise synonyms and precise nouns.", textColor: "text-amber-400",   barColor: "bg-amber-400",   statusPct };
  return            { insight: "Repetitive phrasing — varying vocabulary raises your band score.", textColor: "text-rose-400",    barColor: "bg-rose-400",    statusPct };
}

function wordCountSignal(count: number): Signal {
  const statusPct = Math.min(100, Math.round((count / 180) * 100));
  if (count < 60)  return { insight: "Very short — try to use the full time allotted for the task.", textColor: "text-rose-400",    barColor: "bg-rose-400",    statusPct };
  if (count < 90)  return { insight: "Slightly brief — elaborate more to maximise Task Completion marks.", textColor: "text-amber-400",   barColor: "bg-amber-400",   statusPct };
  if (count <= 180) return { insight: "Good length — you are making full use of your response time.", textColor: "text-emerald-400", barColor: "bg-emerald-400", statusPct };
  return            { insight: "Long response — ensure your pace is comfortable, not rushed.", textColor: "text-amber-400",   barColor: "bg-amber-400",   statusPct: 100 };
}

function sentenceSignal(shortPct: number): Signal {
  const statusPct = 100 - shortPct;
  if (shortPct <= 30) return { insight: "Good sentence variety — demonstrates strong grammatical range.", textColor: "text-emerald-400", barColor: "bg-emerald-400", statusPct };
  if (shortPct <= 55) return { insight: "Some short sentences — use connectors to combine ideas.", textColor: "text-amber-400",   barColor: "bg-amber-400",   statusPct };
  return               { insight: "Many short sentences — limits your Grammatical Accuracy score.", textColor: "text-rose-400",    barColor: "bg-rose-400",    statusPct };
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, unit, detail, signal }: {
  label:   string;
  value:   string;
  unit?:   string;
  detail?: string;
  signal:  Signal;
}) {
  return (
    <div className="rounded-xl border border-border bg-white/[0.02] p-4 flex flex-col gap-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums text-white/90">{value}</span>
        {unit && <span className="text-xs text-white/30">{unit}</span>}
      </div>
      <div className="h-0.5 w-full rounded-full bg-white/[0.08]">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${signal.barColor}`}
          style={{ width: `${Math.max(2, signal.statusPct)}%` }}
        />
      </div>
      {detail && <p className="text-[11px] text-white/30">{detail}</p>}
      <p className={`text-xs leading-relaxed ${signal.textColor}`}>{signal.insight}</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function TranscriptAnalysisCard({ transcript, taskDurationS }: Props) {
  const s = useMemo(() => analyse(transcript ?? "", taskDurationS), [transcript, taskDurationS]);
  if (!s.wordCount) return null;

  const wpmS  = wpmSignal(s.estimatedWpm);
  const ttrS  = ttrSignal(s.ttr);
  const wdS   = wordCountSignal(s.wordCount);
  const sentS = sentenceSignal(s.shortPct);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-white/40" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Speech Analytics</h3>
        </div>
      </div>

      {/* 2×2 metric grid — always expanded */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Speaking Pace"
          value={`${s.estimatedWpm}`}
          unit="wpm"
          signal={wpmS}
        />
        <MetricCard
          label="Vocabulary"
          value={`${Math.round(s.ttr * 100)}%`}
          unit="unique"
          detail={`${s.uniqueWords} distinct / ${s.wordCount} total words`}
          signal={ttrS}
        />
        <MetricCard
          label="Words Spoken"
          value={`${s.wordCount}`}
          detail={`~${s.sentences} sentence${s.sentences !== 1 ? "s" : ""} detected`}
          signal={wdS}
        />
        <MetricCard
          label="Sentence Variety"
          value={`${100 - s.shortPct}%`}
          unit="varied"
          detail={`${s.shortPct}% are short sentences (<9 words)`}
          signal={sentS}
        />
      </div>

      <p className="text-[10px] leading-relaxed text-white/20 border-t border-white/[0.05] pt-3">
        Metrics are estimated from your transcript text. Actual CELPIP scores reflect human examiner judgment — use these as practice signals.
      </p>
    </div>
  );
}
