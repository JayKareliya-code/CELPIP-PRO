"use client";

// ─────────────────────────────────────────────────────────────────────────────
// TaskAttemptRing — Circular progress indicator for per-task attempt quota.
// Renders a small SVG ring in the top-right corner of each TaskCard.
// ─────────────────────────────────────────────────────────────────────────────

interface TaskAttemptRingProps {
  used: number;
  limit: number | null; // null = unlimited
  isBonusRetry?: boolean;
  size?: number;
}

export function TaskAttemptRing({
  used,
  limit,
  isBonusRetry = false,
  size = 40,
}: TaskAttemptRingProps) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;

  const pct = limit === null ? 1 : Math.min(used / limit, 1);
  const offset = circumference * (1 - pct);

  // Colour palette
  const trackColor = "rgba(255,255,255,0.07)";
  const progressColor =
    isBonusRetry
      ? "#f59e0b"          // amber when quota exhausted
      : pct >= 1
      ? "#ef4444"          // red at 100%
      : pct >= 0.6
      ? "#f59e0b"          // amber 60–99%
      : "#6366f1";         // indigo otherwise

  const label =
    limit === null
      ? "∞"
      : isBonusRetry
      ? "∞"
      : `${used}/${limit}`;

  const fontSize = size <= 36 ? 8 : size <= 48 ? 10 : 12;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      aria-label={`${used} of ${limit ?? "unlimited"} attempts used`}
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={3}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={progressColor}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      {/* Centre label */}
      <text
        x={size / 2}
        y={size / 2}
        dominantBaseline="middle"
        textAnchor="middle"
        fill={progressColor}
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="inherit"
      >
        {label}
      </text>
    </svg>
  );
}
