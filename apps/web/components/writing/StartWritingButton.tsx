// ─────────────────────────────────────────────────────────────────────────────
// StartWritingButton.tsx — CTA that routes to /writing/[task]/practice
// ─────────────────────────────────────────────────────────────────────────────

import Link       from "next/link";
import { PenLine } from "lucide-react";
import { cn }     from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface StartWritingButtonProps {
  taskId:     string;
  disabled?:  boolean;
  className?: string;
}

/**
 * Full-width CTA that routes to the writing practice session.
 * Mirrors StartPracticeButton from the speaking module — same style contract.
 */
export function StartWritingButton({
  taskId,
  disabled  = false,
  className,
}: StartWritingButtonProps) {
  if (disabled) {
    return (
      <button
        disabled
        className={cn(
          "w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl",
          "bg-surface text-subtle border border-border cursor-not-allowed",
          "text-base font-semibold",
          className
        )}
      >
        <PenLine className="w-5 h-5" />
        Upgrade to Write
      </button>
    );
  }

  return (
    <Link
      href={`/writing/${taskId}/practice`}
      className={cn(
        "w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl",
        "bg-primary hover:bg-primary-hover text-white transition-colors duration-150",
        "text-base font-semibold shadow-sm hover:shadow-panel",
        className
      )}
    >
      <PenLine className="w-5 h-5" />
      Start Writing
    </Link>
  );
}
