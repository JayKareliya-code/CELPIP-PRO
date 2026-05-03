// ─────────────────────────────────────────────────────────────────────────────
// components/admin/AnchorEditModal.tsx
//
// Lightweight dialog for editing ONLY the Band 12 calibration anchor on a
// speaking OR writing prompt. Calls the existing PATCH endpoint; no full-form
// fields are exposed — just the textarea and a submit button.
//
// Uses a controlled textarea (not a ref) so React owns the value. The value is
// reset to initialValue whenever `open` transitions to true, which correctly
// handles the case where the same modal is reused for different prompts without
// unmounting.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect }             from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn }                              from "@/lib/utils";
import { inputCls }                        from "@/components/admin/shared/inputCls";

export interface AnchorEditModalProps {
  open:         boolean;
  skill:        "speaking" | "writing";
  taskNumber:   number;
  title:        string;
  /** Current anchor text (may be empty/null). */
  initialValue: string;
  isSaving:     boolean;
  onClose:      () => void;
  /** Called with the new anchor text (trimmed); caller handles the API call. */
  onSave:       (text: string) => void;
}

export function AnchorEditModal({
  open,
  skill,
  taskNumber,
  title,
  initialValue,
  isSaving,
  onClose,
  onSave,
}: AnchorEditModalProps) {
  // Controlled state — reset when the dialog opens (or opens for a new target).
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSave(value.trim());
  }

  const skillLabel = skill === "speaking" ? "Speaking" : "Writing";
  const taskLabel  = skill === "speaking" && taskNumber === 0
    ? "Practice"
    : `Task ${taskNumber}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-full bg-surface border border-border shadow-panel">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Edit Band 12 Calibration Anchor
          </DialogTitle>
          <p className="text-xs text-subtle mt-1">
            <span className="font-semibold text-foreground">
              {skillLabel} · {taskLabel}
            </span>
            {" — "}
            <span className="truncate">{title}</span>
          </p>
        </DialogHeader>

        {/* Info note */}
        <p className="text-xs text-subtle leading-relaxed border border-border rounded-lg px-3 py-2.5 bg-muted">
          This text is injected directly into the AI scoring prompt as the primary Band 12
          reference for this exact question. Write a genuine Band 12 response — the more
          accurate and complete, the better the scoring results.
        </p>

        <form id="anchor-edit-form" onSubmit={handleSubmit} className="space-y-3 mt-1">
          <textarea
            id="anchor-text-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={10}
            autoFocus
            placeholder="Write the ideal Band 12 response for this exact prompt…"
            className={cn(inputCls, "resize-y text-sm w-full")}
          />
          <p className="text-[11px] text-subtle">
            Leave blank to clear the anchor — scoring will fall back to the global
            calibration pool.
          </p>
        </form>

        <DialogFooter className="pt-2 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium
                       text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="anchor-edit-form"
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white
                       text-sm font-semibold transition-colors shadow-sm disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save Anchor"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
