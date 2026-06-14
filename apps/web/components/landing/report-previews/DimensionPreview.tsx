// ─────────────────────────────────────────────────────────────────────────────
// DimensionPreview — static replica of components/report/DimensionBreakdown.tsx.
// Rubric cards with a left accent stripe, hairline score bar and commentary.
// Sample data only — illustrative.
// ─────────────────────────────────────────────────────────────────────────────

interface Dim {
  label: string;
  score: number;
  max: number;
  commentary: string;
}

const DIMENSIONS: Dim[] = [
  { label: "Content & Coherence", score: 10, max: 12, commentary: "Well organised and easy to follow." },
  { label: "Vocabulary", score: 8, max: 12, commentary: "Good range — vary a few repeated words." },
  { label: "Listenability", score: 9, max: 12, commentary: "Clear, natural delivery throughout." },
  { label: "Task Fulfillment", score: 9, max: 12, commentary: "Covered every part of the prompt." },
];

function barColor(s: number) {
  if (s >= 9) return "bg-emerald-400";
  if (s >= 6) return "bg-amber-400";
  return "bg-rose-400";
}
function textColor(s: number) {
  if (s >= 9) return "text-emerald-400";
  if (s >= 6) return "text-amber-400";
  return "text-rose-400";
}
function accent(s: number) {
  if (s >= 9) return "bg-emerald-400/50";
  if (s >= 6) return "bg-amber-400/50";
  return "bg-rose-400/50";
}

export function DimensionPreview() {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-panel">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/30">
        Dimension Breakdown
      </h3>

      <div className="flex flex-col gap-2.5">
        {DIMENSIONS.map((d) => (
          <div
            key={d.label}
            className="relative flex flex-col gap-2 overflow-hidden rounded-xl border border-border/60 bg-white/[0.02] px-4 py-3 pl-5"
          >
            <span className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${accent(d.score)}`} />

            <span className="text-sm font-semibold leading-snug text-white/85">{d.label}</span>

            <div className="flex items-center gap-3">
              <div className="h-0.5 w-1/4 flex-shrink-0 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className={`h-full rounded-full ${barColor(d.score)}`}
                  style={{ width: `${(d.score / d.max) * 100}%` }}
                />
              </div>
              <span className={`flex-shrink-0 text-sm font-bold leading-none tabular-nums ${textColor(d.score)}`}>
                {d.score.toFixed(1)}
                <span className="ml-0.5 text-xs font-normal text-white/30">/{d.max}</span>
              </span>
            </div>

            <p className="text-xs leading-relaxed text-white/55">{d.commentary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
