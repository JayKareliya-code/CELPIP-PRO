"use client";

// ─────────────────────────────────────────────────────────────────────────────
// EssayAnalysisCard.tsx — Client-side writing analytics (zero network calls)
//
// Writing equivalent of TranscriptAnalysisCard. Analyses the raw essay text
// and surfaces 4 metrics in a 2×2 grid:
//
//   1. Word Count          — target range by task type
//   2. Vocabulary Range    — type-token ratio (unique / total)
//   3. Sentence Variety    — % of long (≥12 word) sentences
//   4. Paragraph Structure — paragraph count & avg length
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo }    from "react";
import { BarChart2 } from "lucide-react";

interface Props {
  essayText:  string;
  taskNumber: number;   // 1 = email/letter, 2 = survey/opinion essay
}

interface Stats {
  wordCount:    number;
  uniqueWords:  number;
  ttr:          number;
  sentences:    number;
  longSentPct:  number;   // % sentences ≥ 12 words
  paragraphs:   number;
  avgParaWords: number;
}

function analyse(text: string): Stats {
  const trimmed  = text.trim();
  if (!trimmed) return {
    wordCount: 0, uniqueWords: 0, ttr: 0,
    sentences: 0, longSentPct: 0,
    paragraphs: 0, avgParaWords: 0,
  };

  const lower = trimmed.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const wordCount  = words.length;
  const unique     = new Set(words.map(w => w.replace(/[^a-z']/g, "")));
  const ttr        = wordCount > 0 ? unique.size / wordCount : 0;

  // Sentences
  const rawSents   = trimmed.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const sentences  = rawSents.length;
  const longSents  = rawSents.filter(s => s.split(/\s+/).filter(Boolean).length >= 12).length;
  const longSentPct = sentences > 0 ? Math.round((longSents / sentences) * 100) : 0;

  // Paragraphs (split on blank lines)
  const paras      = trimmed.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const paragraphs = Math.max(1, paras.length);
  const avgParaWords = Math.round(wordCount / paragraphs);

  return {
    wordCount, uniqueWords: unique.size, ttr,
    sentences, longSentPct,
    paragraphs, avgParaWords,
  };
}

// ── Signal helpers ────────────────────────────────────────────────────────────

type Signal = { insight: string; textColor: string; barColor: string; statusPct: number };

function wordCountSignal(count: number, taskNumber: number): Signal {
  // Task 1 = email/letter: 150–200 words. Task 2 = survey/essay: 150–280 words.
  const lo        = 130;
  const hi        = taskNumber === 2 ? 300 : 220;
  const statusPct = Math.min(100, Math.round((count / hi) * 100));

  if (count < lo)   return { insight: `Too short — aim for ${lo}–${hi} words to fully address the task.`,          textColor: "text-rose-400",    barColor: "bg-rose-400",    statusPct };
  if (count <= hi)  return { insight: `Good length — within the ideal ${lo}–${hi} word range for this task.`,    textColor: "text-emerald-400", barColor: "bg-emerald-400", statusPct };
  return                   { insight: "Over target — focus on conciseness; quality matters more than quantity.",  textColor: "text-amber-400",   barColor: "bg-amber-400",   statusPct: 100 };
}

function ttrSignal(ttr: number): Signal {
  const statusPct = Math.round(ttr * 100);
  if (ttr >= 0.62) return { insight: "Excellent vocabulary variety — signals Band 9+ range.",                        textColor: "text-emerald-400", barColor: "bg-emerald-400", statusPct };
  if (ttr >= 0.48) return { insight: "Good variety — practise synonyms and precise nouns to push higher.",          textColor: "text-amber-400",   barColor: "bg-amber-400",   statusPct };
  return                  { insight: "Repetitive phrasing detected — varying vocabulary raises your band score.",   textColor: "text-rose-400",    barColor: "bg-rose-400",    statusPct };
}

function sentenceVarietySignal(longPct: number): Signal {
  const statusPct = longPct;
  if (longPct >= 50) return { insight: "Good sentence variety — complex sentences show strong grammatical range.",  textColor: "text-emerald-400", barColor: "bg-emerald-400", statusPct };
  if (longPct >= 30) return { insight: "Moderate variety — use subordinate clauses and connectors more often.",     textColor: "text-amber-400",   barColor: "bg-amber-400",   statusPct };
  return                    { insight: "Many short sentences — combine ideas with connectors (although, however).", textColor: "text-rose-400",    barColor: "bg-rose-400",    statusPct };
}

function paragraphSignal(paragraphs: number, taskNumber: number): Signal {
  // Email expects 3–5 paragraphs; essay 3–4
  const lo = 3; const hi = taskNumber === 2 ? 4 : 5;
  const statusPct = Math.min(100, Math.round((paragraphs / (hi + 1)) * 100));
  if (paragraphs < lo)  return { insight: `Too few paragraphs — aim for ${lo}–${hi} for clear structure (intro, body, closing).`, textColor: "text-rose-400",    barColor: "bg-rose-400",    statusPct };
  if (paragraphs <= hi) return { insight: `Good paragraph structure — clear sections help your Organization score.`,               textColor: "text-emerald-400", barColor: "bg-emerald-400", statusPct };
  return                       { insight: "Many short paragraphs — consider merging related points for a cleaner flow.",           textColor: "text-amber-400",   barColor: "bg-amber-400",   statusPct: 100 };
}

// ── Shared MetricCard (identical design to TranscriptAnalysisCard) ────────────

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

export function EssayAnalysisCard({ essayText, taskNumber }: Props) {
  const s = useMemo(() => analyse(essayText ?? ""), [essayText]);
  if (!s.wordCount) return null;

  const wdS   = wordCountSignal(s.wordCount, taskNumber);
  const ttrS  = ttrSignal(s.ttr);
  const sentS = sentenceVarietySignal(s.longSentPct);
  const paraS = paragraphSignal(s.paragraphs, taskNumber);

  const taskLabel = taskNumber === 2 ? "Survey / Essay" : "Email / Letter";

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-white/40" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Writing Analytics</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/30">
          Task {taskNumber} · {taskLabel}
        </span>
      </div>

      {/* 2×2 metric grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Word Count"
          value={`${s.wordCount}`}
          unit="words"
          detail={`~${s.sentences} sentence${s.sentences !== 1 ? "s" : ""} detected`}
          signal={wdS}
        />
        <MetricCard
          label="Vocabulary Range"
          value={`${Math.round(s.ttr * 100)}%`}
          unit="unique"
          detail={`${s.uniqueWords} distinct / ${s.wordCount} total words`}
          signal={ttrS}
        />
        <MetricCard
          label="Sentence Variety"
          value={`${s.longSentPct}%`}
          unit="complex"
          detail={`Sentences with ≥12 words`}
          signal={sentS}
        />
        <MetricCard
          label="Paragraphs"
          value={`${s.paragraphs}`}
          unit={s.paragraphs !== 1 ? "paras" : "para"}
          detail={`~${s.avgParaWords} words per paragraph`}
          signal={paraS}
        />
      </div>

      <p className="text-[10px] leading-relaxed text-white/20 border-t border-white/[0.05] pt-3">
        Metrics are computed from your submitted essay text. Use these as practice signals — actual CELPIP scores reflect human examiner judgment.
      </p>
    </div>
  );
}
