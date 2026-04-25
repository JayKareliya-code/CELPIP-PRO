"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingExamCompleteScreen — Shown after both mock tasks are submitted.
//
// Polls GET /writing/mock-results?attempt_ids=<id1>,<id2> every 5 s until
// all_scored = true, then renders the two band scores side-by-side.
// Mirrors ExamCompleteScreen for speaking mock exams.
// ─────────────────────────────────────────────────────────────────────────────

import { useRouter }     from "next/navigation";
import { useAuth }       from "@clerk/nextjs";
import { useQuery }      from "@tanstack/react-query";
import { PenLine, Loader2, CheckCircle2, RotateCcw } from "lucide-react";
import { cn }            from "@/lib/utils";
import { API_V1, authHeaders } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaskResult {
  attempt_id:     string;
  task_number:    number;
  status:         string;
  estimated_band: number | null;
}

interface ResultsResponse {
  results:    TaskResult[];
  all_scored: boolean;
}

// ── Band chip ─────────────────────────────────────────────────────────────────

function BandChip({ band }: { band: number | null }) {
  if (band === null) return null;
  const color =
    band >= 9   ? "text-emerald-400 border-emerald-700/40 bg-emerald-900/30" :
    band >= 7   ? "text-amber-400   border-amber-700/40   bg-amber-900/30"   :
    band >= 5   ? "text-amber-300   border-amber-700/30   bg-amber-900/20"   :
                  "text-red-400     border-red-700/40     bg-red-900/30";

  return (
    <div className={cn(
      "inline-flex items-center justify-center rounded-xl border px-5 py-3",
      "text-3xl font-bold tabular-nums leading-none",
      color,
    )}>
      {band.toFixed(1)}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingExamCompleteScreenProps {
  attempt1Id: string;
  attempt2Id: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TASK_LABELS: Record<number, string> = {
  1: "Task 1 — Email",
  2: "Task 2 — Essay",
};

export function WritingExamCompleteScreen({ attempt1Id, attempt2Id }: WritingExamCompleteScreenProps) {
  const router      = useRouter();
  const { getToken } = useAuth();

  const attemptIds = `${attempt1Id},${attempt2Id}`;

  // Poll until all_scored = true
  const { data } = useQuery<ResultsResponse>({
    queryKey: ["writingMockResults", attemptIds],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE}${API_V1}/writing/mock-results?attempt_ids=${attemptIds}`,
        { headers: authHeaders(token) },
      );
      if (!res.ok) throw new Error("Could not fetch results");
      return res.json();
    },
    refetchInterval: (query) => {
      const d = query.state.data as ResultsResponse | undefined;
      return d?.all_scored ? false : 5_000;   // stop polling once complete
    },
    staleTime: 0,
  });

  const allScored = data?.all_scored ?? false;
  const results   = data?.results ?? [];

  // Average band across both tasks (shown in header)
  const bands   = results.map((r) => r.estimated_band).filter((b): b is number => b !== null);
  const avgBand = bands.length ? bands.reduce((a, b) => a + b, 0) / bands.length : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted gap-8 px-6 text-center">

      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center">
        {allScored
          ? <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          : <PenLine className="w-8 h-8 text-emerald-400" />
        }
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Writing Mock Complete!</h1>
        {allScored
          ? avgBand !== null
              ? <p className="text-subtle text-sm">Your overall estimated band</p>
              : <p className="text-subtle text-sm">Scoring complete — see results below.</p>
          : (
            <div className="flex items-center justify-center gap-2 text-subtle text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              AI is scoring your essays…
            </div>
          )
        }
      </div>

      {/* Overall band */}
      {allScored && avgBand !== null && (
        <BandChip band={Math.round(avgBand * 2) / 2} />
      )}

      {/* Per-task results */}
      {results.length > 0 && (
        <div className="w-full max-w-sm space-y-3">
          {results.map((r) => (
            <div
              key={r.attempt_id}
              className="rounded-xl border border-white/[0.08] bg-surface px-4 py-3 flex items-center justify-between gap-4"
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">
                  {TASK_LABELS[r.task_number] ?? `Task ${r.task_number}`}
                </p>
                <p className="text-xs text-subtle mt-0.5 capitalize">{r.status}</p>
              </div>

              <div className="flex items-center gap-3">
                {r.estimated_band !== null
                  ? (
                    <span className="text-2xl font-bold tabular-nums text-emerald-400">
                      {r.estimated_band.toFixed(1)}
                    </span>
                  )
                  : r.status === "failed"
                    ? <span className="text-xs text-red-400">Failed</span>
                    : <Loader2 className="w-5 h-5 animate-spin text-subtle" />
                }

                {/* Link to full attempt report */}
                <button
                  onClick={() => router.push(`/attempts/${r.attempt_id}/status`)}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors underline"
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skeleton while loading */}
      {results.length === 0 && (
        <div className="w-full max-w-sm space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-surface h-16 animate-pulse" />
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={() => router.push("/practice/writing")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10
                     bg-surface hover:bg-muted text-sm font-semibold text-foreground transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Retake Exam
        </button>
        <button
          onClick={() => router.push("/history")}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90
                     text-primary-foreground text-sm font-semibold transition-colors border border-amber-400/30"
        >
          View History
        </button>
      </div>
    </div>
  );
}
