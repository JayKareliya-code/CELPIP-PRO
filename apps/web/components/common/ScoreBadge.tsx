import { cn, formatBand } from "@/lib/utils";
import { BAND_LABELS } from "@/lib/constants";

interface ScoreBadgeProps {
  /** CELPIP band score 1–12, or null when score is not yet available */
  band: number | null | undefined;
  size?: "sm" | "md" | "lg";
  /** Show the band label (e.g. "Competent") alongside the number */
  showLabel?: boolean;
  /** Render as plain coloured text — no pill background or border */
  plain?: boolean;
  className?: string;
}

/** Returns the Tailwind text colour class for a given band score. */
function getBandColor(band: number): string {
  if (band >= 9) return "text-success";
  if (band >= 6) return "text-warning";
  return "text-danger";
}

/** Returns the Tailwind colour variant (pill style) for a given band score. */
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
  plain = false,
  className,
}: ScoreBadgeProps) {
  const isEmpty = band === null || band === undefined;

  // Plain variant — just bold coloured text, no pill
  if (plain) {
    return (
      <span
        className={cn(
          "font-bold tabular-nums shrink-0",
          "text-xl",
          isEmpty ? "text-subtle" : getBandColor(band),
          className,
        )}
      >
        {isEmpty ? "—" : band}
      </span>
    );
  }

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
      {isEmpty ? "—" : formatBand(band)}
      {!isEmpty && showLabel && band in BAND_LABELS && (
        <span className="font-normal opacity-80">{BAND_LABELS[band]}</span>
      )}
    </span>
  );
}
