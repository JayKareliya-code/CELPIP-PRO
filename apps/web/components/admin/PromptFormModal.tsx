"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PromptFormModal.tsx — Create / Edit prompt dialog (~80 lines).
// Delegates field rendering to SharedFormFields, SpeakingFormFields,
// WritingFormFields. handleSubmit never calls onClose — parent controls lifecycle.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef }   from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SharedFormFields }    from "@/components/admin/form/SharedFormFields";
import { SpeakingFormFields }  from "@/components/admin/form/SpeakingFormFields";
import { WritingFormFields }   from "@/components/admin/form/WritingFormFields";
import type { SpeakingPrompt, WritingPrompt } from "@/lib/types";

type PromptSkill = "speaking" | "writing";

export interface PromptFormModalProps {
  open:             boolean;
  skill:            PromptSkill;
  initialPrompt?:   SpeakingPrompt | WritingPrompt;
  onClose:          () => void;
  onSave:           (data: FormData) => void;
  isSaving?:        boolean;
  /** When provided, form runs in task-context mode — hides task number / title / slug / topic. */
  lockedTaskNumber?: number;
}

export function PromptFormModal({
  open, skill, initialPrompt, onClose, onSave, isSaving = false, lockedTaskNumber,
}: PromptFormModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit  = Boolean(initialPrompt);

  // Reset the form when the modal opens for a NEW prompt (no initialPrompt).
  // For edit mode the `key` prop on the <form> already gives fresh state per prompt.
  // We intentionally do NOT reset on close — resetting after Save fires causes the
  // hidden context_image_url input to be wiped while the PATCH is still in-flight.
  useEffect(() => {
    if (open && !initialPrompt) formRef.current?.reset();
  }, [open, initialPrompt?.id]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSave(new FormData(e.currentTarget));
  }

  const sp = skill === "speaking" ? (initialPrompt as SpeakingPrompt | undefined) : undefined;
  const wp = skill === "writing"  ? (initialPrompt as WritingPrompt  | undefined) : undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-full bg-surface border border-border shadow-panel">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            {isEdit ? "Edit" : "Add"}{" "}
            {skill === "speaking" ? "Speaking" : "Writing"} Prompt
            {!isEdit && lockedTaskNumber !== undefined && (
              <span className="ml-1 font-normal text-subtle"> — Task {lockedTaskNumber}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form
          key={`${skill}-${initialPrompt?.id ?? "new"}`}
          ref={formRef}
          id="prompt-form"
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1"
        >
          <SharedFormFields skill={skill} initial={initialPrompt} lockedTaskNumber={lockedTaskNumber} />
          {skill === "speaking" && <SpeakingFormFields initial={sp} taskNumber={lockedTaskNumber ?? sp?.task_number} />}
          {skill === "writing"  && <WritingFormFields  initial={wp} taskNumber={lockedTaskNumber ?? wp?.task_number} />}
        </form>

        <DialogFooter className="pt-4 flex gap-2 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium
                       text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button type="submit" form="prompt-form"
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white
                       text-sm font-semibold transition-colors shadow-sm
                       disabled:opacity-50 disabled:cursor-not-allowed">
            {isEdit ? "Save Changes" : "Add Prompt"}
            {isSaving && <span className="ml-1.5 inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
