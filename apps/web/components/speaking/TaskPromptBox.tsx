// ─────────────────────────────────────────────────────────────────────────────
// TaskPromptBox — Prompt display box used during PREP and optionally RECORDING.
//
// Layout variants:
//   text-only   Tasks 1, 2, 6, 7  → just the prompt text
//   with-image  Tasks 3, 4, 8     → shared scene image above the prompt text
//
// Image dimensions:  medium — max-h-56 (224 px tall), full container width.
// ─────────────────────────────────────────────────────────────────────────────

import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskPromptBoxProps {
  promptText: string;
  /** Context image URL — present for Tasks 3, 4, 8. */
  imageUrl?: string | null;
  className?: string;
}

/**
 * Renders the task prompt.
 * - If imageUrl is provided: shows the image above the prompt text.
 * - If no imageUrl: renders prompt text only (clean card).
 */
export function TaskPromptBox({ promptText, imageUrl, className }: TaskPromptBoxProps) {
  const hasImage = Boolean(imageUrl);

  return (
    <div
      className={cn(
        "bg-surface rounded-xl border border-border overflow-hidden",
        className,
      )}
    >
      {/* ── Scene image (Tasks 3, 4, 8) ──────────────────────────────────── */}
      {hasImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl!}
          alt="Task scene"
          className="w-full object-cover max-h-56"
          draggable={false}
        />
      )}

      {/* ── Prompt text ───────────────────────────────────────────────────── */}
      <div className={cn("px-5 py-4", hasImage && "border-t border-border/60")}>
        {hasImage && (
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-subtle/60 mb-2 select-none">
            Your prompt
          </p>
        )}
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
          {promptText}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ImagePlaceholder — shown in the TaskPromptsFolder card list when the
// task is image-based but no URL is available yet (e.g. coming-soon slot).
// ─────────────────────────────────────────────────────────────────────────────

export function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-t-xl bg-white/[0.03] border-b border-dashed border-border",
        "h-32",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-1.5 text-subtle/40">
        <ImageIcon className="w-6 h-6" />
        <span className="text-xs">Scene image</span>
      </div>
    </div>
  );
}
