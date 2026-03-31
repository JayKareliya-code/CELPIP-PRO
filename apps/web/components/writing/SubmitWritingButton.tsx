// ─────────────────────────────────────────────────────────────────────────────
// SubmitWritingButton.tsx — Manual submit CTA shown during the WRITING phase
//
// Distinct from StartWritingButton (instruction page CTA).
// This lives inside the session header and triggers the SUBMITTING transition.
// Shows a spinner while disabled (submitting in progress).
// ─────────────────────────────────────────────────────────────────────────────

import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface SubmitWritingButtonProps {
  /** Call when the user confirms they want to submit early. */
  onSubmit:      () => void;
  /** True while the submission is in progress — disables the button. */
  isSubmitting?: boolean;
  /** Disable if the user has no content yet. */
  disabled?:     boolean;
  className?:    string;
}

/**
 * Manual submit button inside the writing session.
 * Disabled and shows a spinner while `isSubmitting` is true.
 * Requires a minimum of content before enabling (controlled by `disabled` prop).
 */
export function SubmitWritingButton({
  onSubmit,
  isSubmitting = false,
  disabled     = false,
  className,
}: SubmitWritingButtonProps) {
  const isDisabled = disabled || isSubmitting;

  return (
    <button
      type="button"
      id="submit-writing-btn"
      onClick={onSubmit}
      disabled={isDisabled}
      aria-busy={isSubmitting}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold",
        "transition-all duration-150 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isDisabled
          ? "bg-border text-subtle cursor-not-allowed"
          : "bg-primary hover:bg-primary-hover text-white shadow-sm hover:shadow-panel",
        className
      )}
    >
      {isSubmitting ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        <Send className="w-4 h-4" aria-hidden="true" />
      )}
      {isSubmitting ? "Submitting…" : "Submit"}
    </button>
  );
}
