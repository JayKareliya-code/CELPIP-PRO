// ─────────────────────────────────────────────────────────────────────────────
// TaskPromptBox — Unified prompt display card used across all exam screens.
//
// Variants:
//   default  — instruction page (solid bg-surface)
//   overlay  — PREP & RECORDING screens (glassmorphic bg-white/4)
//   compact  — subdued reference during recording phase
//
// All variants share the amber left accent border as a visual signature.
//
// Image support:
//   When imageUrl is provided, the image renders above the prompt text
//   with a border separator.
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaskPromptBoxProps {
  /** The prompt text to display. */
  promptText: string;
  /** Context image URL — present for Tasks 3, 4, 8. */
  imageUrl?: string | null;
  /** Override the label text (default: "Your prompt"). */
  label?: string;
  /**
   * Visual variant:
   *   default — solid surface card (instruction page)
   *   overlay — glassmorphic for exam screens (PREP / RECORDING)
   *   compact — subdued for recording-phase prompt reference
   */
  variant?: "default" | "overlay" | "compact";
  className?: string;
}

// ── Variant styles ────────────────────────────────────────────────────────────

const VARIANT_STYLES = {
  default: {
    card:      "bg-surface border-border",
    text:      "text-foreground text-sm sm:text-base",
    label:     "text-primary/60",
    padding:   "px-5 py-4",
  },
  overlay: {
    card:      "bg-white/[0.04] border-white/[0.08]",
    text:      "text-canvas-text text-sm sm:text-base leading-relaxed",
    label:     "text-primary/60",
    padding:   "px-5 py-4",
  },
  compact: {
    card:      "bg-white/[0.03] border-white/[0.06]",
    text:      "text-canvas-subtle text-xs sm:text-sm leading-relaxed",
    label:     "text-primary/40",
    padding:   "px-4 py-3",
  },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Unified prompt display card.
 *
 * Design: amber left accent border (3px) + small uppercase label + prompt text.
 * The accent border is the visual signature that says "this is what you need
 * to read" — consistent across all 8 speaking tasks.
 */
export function TaskPromptBox({
  promptText,
  imageUrl,
  label = "Your prompt",
  variant = "default",
  className,
}: TaskPromptBoxProps) {
  const hasImage = Boolean(imageUrl);
  const styles   = VARIANT_STYLES[variant];

  return (
    <div
      className={cn(
        "rounded-2xl border overflow-hidden",
        "border-l-[3px] border-l-primary/50",
        styles.card,
        className,
      )}
    >
      {/* ── Scene image (Tasks 3, 4, 8) ──────────────────────────────────── */}
      {hasImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl!}
          alt="Task scene"
          className="w-full h-auto object-contain"
          draggable={false}
        />
      )}

      {/* ── Prompt text ───────────────────────────────────────────────────── */}
      <div className={cn(styles.padding, hasImage && "border-t border-white/[0.06]")}>
        <p className={cn(
          "text-[10px] font-semibold tracking-[0.15em] uppercase mb-2 select-none",
          styles.label,
        )}>
          {label}
        </p>
        <p className={cn("whitespace-pre-line", styles.text)}>
          {promptText}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ImagePlaceholder has been moved to its own file for single-responsibility.
// Re-exported here for backward compatibility — update imports to:
//   import { ImagePlaceholder } from "@/components/speaking/ImagePlaceholder";
// ─────────────────────────────────────────────────────────────────────────────
export { ImagePlaceholder } from "@/components/speaking/ImagePlaceholder";
