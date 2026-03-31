// ─────────────────────────────────────────────────────────────────────────────
// WritingPromptBox.tsx — Read-only prompt display for writing tasks
//
// Used on both the instruction page and the writing practice session header.
// ─────────────────────────────────────────────────────────────────────────────

import { FileText } from "lucide-react";
import { cn }       from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingPromptBoxProps {
  promptText: string;
  /** "full" = instruction page card; "compact" = top strip in the editor */
  variant?:   "full" | "compact";
  className?: string;
}

/**
 * Read-only writing prompt display.
 *
 * "full" variant: white/dark card with label header — used on instruction page.
 * "compact" variant: slim strip above the Tiptap editor during writing.
 */
export function WritingPromptBox({
  promptText,
  variant   = "full",
  className,
}: WritingPromptBoxProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-surface/60 px-4 py-3",
          className
        )}
      >
        <p className="text-sm text-subtle leading-relaxed whitespace-pre-line">
          {promptText}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface shadow-card p-6",
        className
      )}
    >
      {/* Label row */}
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold tracking-wider uppercase text-subtle">
          Your Writing Prompt
        </span>
      </div>

      {/* Prompt body — prose styling via @tailwindcss/typography */}
      <div className="prose prose-invert prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-line">
        {promptText}
      </div>
    </div>
  );
}
