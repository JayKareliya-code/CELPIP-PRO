// ─────────────────────────────────────────────────────────────────────────────
// PracticeQuotaRing — Reusable SVG ring showing remaining/total tests.
// Used in PracticeSkillCard (hub) and anywhere we need a circular quota display.
// ─────────────────────────────────────────────────────────────────────────────

interface PracticeQuotaRingProps {
  remaining:  number;
  limit:      number;
  color:      string;   // hex fill colour
  size?:      number;   // diameter in px (default 72)
  isLocked?:  boolean;
}

export function PracticeQuotaRing({
  remaining,
  limit,
  color,
  size = 72,
  isLocked = false,
}: PracticeQuotaRingProps) {
  const strokeW   = 4;
  const radius    = (size - strokeW * 2) / 2;
  const circ      = 2 * Math.PI * radius;
  const used      = Math.max(0, limit - remaining);
  const pct       = limit > 0 ? Math.min(used / limit, 1) : 1;
  const offset    = circ * (1 - pct);
  const cx        = size / 2;
  const cy        = size / 2;

  const trackColor    = "rgba(255,255,255,0.07)";
  const progressColor = isLocked ? "rgba(255,255,255,0.15)" : color;
  const labelColor    = isLocked ? "rgba(255,255,255,0.2)"  : color;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      aria-label={`${remaining} of ${limit} tests remaining`}
    >
      {/* Track */}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeW} />

      {/* Progress arc */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={progressColor}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />

      {/* Centre: count */}
      <text
        x={cx} y={cy - 5}
        textAnchor="middle" dominantBaseline="middle"
        fill={labelColor}
        fontSize={size >= 64 ? 14 : 10}
        fontWeight="700"
        fontFamily="inherit"
      >
        {isLocked ? "–" : remaining}
      </text>

      {/* Centre: label */}
      <text
        x={cx} y={cy + 11}
        textAnchor="middle" dominantBaseline="middle"
        fill="rgba(255,255,255,0.3)"
        fontSize={size >= 64 ? 9 : 7}
        fontFamily="inherit"
      >
        {isLocked ? "locked" : "left"}
      </text>
    </svg>
  );
}
