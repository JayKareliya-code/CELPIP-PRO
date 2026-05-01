// ─────────────────────────────────────────────────────────────────────────────
// ScoreSparkline.tsx — Tiny SVG polyline chart for a score series
//
// Pure SVG, no chart library. 80×32px viewBox.
// Maps band scores (1–12) to y-coordinates and draws a smooth polyline.
// ─────────────────────────────────────────────────────────────────────────────

interface ScoreSparklineProps {
  scores: number[];  // ordered oldest → newest, values 1–12
  trend:  "up" | "down" | "steady" | "none";
  /** Width in pixels (default 80) */
  width?: number;
  /** Height in pixels (default 32) */
  height?: number;
}

const BAND_MIN = 1;
const BAND_MAX = 12;
const PADDING  = 3;  // px inset so strokes aren't clipped

/** Map a band value to a Y pixel within the SVG viewport (inverted: higher = up). */
function bandToY(band: number, h: number): number {
  const pct = (band - BAND_MIN) / (BAND_MAX - BAND_MIN);
  return (h - PADDING) - pct * (h - PADDING * 2);
}

const STROKE_COLOR: Record<string, string> = {
  up:     "#34D399",  // success green
  steady: "#FBBF24",  // warning amber
  down:   "#F87171",  // danger red
  none:   "#8892A4",  // subtle grey
};

const AREA_COLOR: Record<string, string> = {
  up:     "rgba(52,211,153,0.12)",
  steady: "rgba(251,191,36,0.10)",
  down:   "rgba(248,113,113,0.10)",
  none:   "rgba(136,146,164,0.08)",
};

export function ScoreSparkline({ scores, trend, width = 80, height = 32 }: ScoreSparklineProps) {
  if (scores.length < 2) {
    // Single point — render a dot
    if (scores.length === 1) {
      const cx = width / 2;
      const cy = bandToY(scores[0], height);
      return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
          <circle cx={cx} cy={cy} r={3} fill={STROKE_COLOR[trend]} opacity={0.8} />
        </svg>
      );
    }
    return null;
  }

  const step = (width - PADDING * 2) / (scores.length - 1);

  const points = scores.map((s, i) => ({
    x: PADDING + i * step,
    y: bandToY(s, height),
  }));

  const polyPoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Area fill path: go along line then close to bottom
  const areaPath = [
    `M ${points[0].x.toFixed(1)},${height}`,
    ...points.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `L ${points[points.length - 1].x.toFixed(1)},${height}`,
    "Z",
  ].join(" ");

  const stroke = STROKE_COLOR[trend];
  const area   = AREA_COLOR[trend];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={`Score trend: ${trend}`}
      role="img"
    >
      {/* Area fill */}
      <path d={areaPath} fill={area} />
      {/* Line */}
      <polyline
        points={polyPoints}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2.5}
        fill={stroke}
      />
    </svg>
  );
}
