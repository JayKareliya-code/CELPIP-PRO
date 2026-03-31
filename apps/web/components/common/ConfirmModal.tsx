// ─────────────────────────────────────────────────────────────────────────────
// ConfirmModal.tsx — Generic confirm / cancel dialog (shadcn/ui Dialog)
//
// Used for destructive or irreversible actions that need explicit consent.
// Caller controls open state + callback; the modal is purely presentational.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  /** Controls whether the modal is visible. */
  open:         boolean;
  /** Called when the user cancels or closes the modal. */
  onCancel:     () => void;
  /** Called when the user confirms the action. */
  onConfirm:    () => void;
  /** Modal title (short, action-oriented). */
  title:        string;
  /** Supporting description of what will happen. */
  description?: string;
  /** Label for the confirm button — default "Confirm". */
  confirmLabel?:  string;
  /** Whether the confirm action is destructive (red button). */
  isDestructive?: boolean;
  /** Label for the cancel button — default "Cancel". */
  cancelLabel?:   string;
}

/**
 * Generic confirm/cancel modal built on shadcn/ui Dialog.
 * Use for any irreversible action (exit session, delete prompt, etc.).
 *
 * @example
 * <ConfirmModal
 *   open={showExit}
 *   onCancel={() => setShowExit(false)}
 *   onConfirm={handleExit}
 *   title="Leave practice session?"
 *   description="Your progress will not be saved."
 *   isDestructive
 * />
 */
export function ConfirmModal({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel  = "Confirm",
  cancelLabel   = "Cancel",
  isDestructive = false,
}: ConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter className="flex-row justify-end gap-2 pt-2">
          {/* Cancel */}
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border
                       text-foreground hover:bg-muted transition-colors duration-100
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {cancelLabel}
          </button>

          {/* Confirm */}
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold text-white",
              "transition-colors duration-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              isDestructive
                ? "bg-danger hover:bg-red-600 focus-visible:ring-danger"
                : "bg-primary hover:bg-primary-hover focus-visible:ring-primary"
            )}
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
