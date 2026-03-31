import { cn } from "@/lib/utils";
import { BAND_LABELS } from "@/lib/constants";

interface ScoreBadgeProps {
  /** CELPIP band score 1–12, or null when score is not yet available */
  band: number | null | undefined;
  size?: "sm" | "md" | "lg";
  /** Show the band label (e.g. "Competent") alongside the number */
  showLabel?: boolean;
  className?: string;
}

/** Returns the Tailwind colour variant for a given band score. */
function getBandVariant(band: number): string {
  if (band >= 9) return "bg-success-light text-success border-success/30";
  if (band >= 6) return "bg-warning-light text-warning border-warning/30";
  return "bg-danger-light text-danger border-danger/30";
}

/**
 * Colour-coded band score badge (1–12 CELPIP scale).
 * Renders "—" when the score is null (attempt still processing).
 */
export function ScoreBadge({
  band,
  size = "md",
  showLabel = false,
  className,
}: ScoreBadgeProps) {
  const isEmpty = band === null || band === undefined;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        size === "sm" ? "px-2 py-0.5 text-xs" : size === "lg" ? "px-5 py-2 text-xl" : "px-3 py-1 text-sm",
        isEmpty
          ? "bg-muted text-subtle border-border"
          : getBandVariant(band),
        className
      )}
    >
      {isEmpty ? "—" : band}
      {!isEmpty && showLabel && band in BAND_LABELS && (
        <span className="font-normal opacity-80">{BAND_LABELS[band]}</span>
      )}
    </span>
  );
}
