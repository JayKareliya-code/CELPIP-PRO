// ─────────────────────────────────────────────────────────────────────────────
// PromptFormModal.tsx — Create / Edit prompt dialog
//
// Supports both "speaking" and "writing" prompt types.
// Speaking fields: task number, title, prep time, response time, prompt text,
//                  difficulty, active toggle.
// Writing fields:  task number, title, time limit, min words, max words,
//                  prompt text, active toggle.
//
// Uses shadcn/ui Dialog. Form submission is handled via native <form>
// onSubmit so it works without a backend in Phase 1 (logs to console).
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef }              from "react";
import { X }                              from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn }                             from "@/lib/utils";
import type { SpeakingPrompt, WritingPrompt } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

type PromptSkill = "speaking" | "writing";

interface PromptFormModalProps {
  open:           boolean;
  skill:          PromptSkill;
  /** Provide to pre-populate the form (edit mode). Omit for create mode. */
  initialPrompt?: SpeakingPrompt | WritingPrompt;
  onClose:        () => void;
  /** Called with the raw FormData after validation passes. */
  onSave:         (data: FormData) => void;
}

// ── Reusable field primitives ─────────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  required = false,
  children,
}: {
  label:    string;
  htmlFor:  string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-foreground">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = cn(
  "w-full rounded-lg border border-border bg-muted px-3 py-2",
  "text-sm text-foreground placeholder:text-subtle/60",
  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
  "transition-colors duration-150"
);

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Controlled dialog for creating or editing a speaking / writing prompt.
 * `initialPrompt` being set puts the form into edit mode and pre-populates fields.
 */
export function PromptFormModal({
  open,
  skill,
  initialPrompt,
  onClose,
  onSave,
}: PromptFormModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit  = Boolean(initialPrompt);

  // Reset form when the modal closes or a different prompt is loaded
  useEffect(() => {
    if (!open) formRef.current?.reset();
  }, [open, initialPrompt]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onSave(data);
    onClose();
  }

  // Speaking-specific prompt fields (cast safely)
  const sp = skill === "speaking" ? (initialPrompt as SpeakingPrompt | undefined) : undefined;
  const wp = skill === "writing"  ? (initialPrompt as WritingPrompt  | undefined) : undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-full bg-surface border border-border shadow-panel">
        <DialogHeader className="flex flex-row items-start justify-between gap-2 pb-0">
          <DialogTitle className="text-base font-bold text-foreground">
            {isEdit ? "Edit" : "Add"}{" "}
            {skill === "speaking" ? "Speaking" : "Writing"} Prompt
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-subtle hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <form
          ref={formRef}
          id="prompt-form"
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1"
        >
          {/* ── Task number ──────────────────────────────────────────────── */}
          <Field label="Task Number" htmlFor="task_number" required>
            <input
              id="task_number"
              name="task_number"
              type="number"
              min={skill === "writing" ? 1 : 0}
              max={skill === "writing" ? 2 : 8}
              required
              defaultValue={sp?.task_number ?? wp?.task_number ?? ""}
              className={inputCls}
              placeholder={skill === "writing" ? "1 or 2" : "0–8"}
            />
          </Field>

          {/* ── Title ────────────────────────────────────────────────────── */}
          <Field label="Title" htmlFor="title" required>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={sp?.title ?? wp?.title ?? ""}
              className={inputCls}
              placeholder="e.g. Giving Advice"
            />
          </Field>

          {/* ── Prompt text ───────────────────────────────────────────────── */}
          <Field label="Prompt Text" htmlFor="prompt_text" required>
            <textarea
              id="prompt_text"
              name="prompt_text"
              rows={4}
              required
              defaultValue={sp?.prompt_text ?? wp?.prompt_text ?? ""}
              className={cn(inputCls, "resize-y")}
              placeholder="Write the full task prompt shown to candidates…"
            />
          </Field>

          {/* ── Speaking-only fields ──────────────────────────────────────── */}
          {skill === "speaking" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prep Time (sec)" htmlFor="prep_time_seconds" required>
                  <input
                    id="prep_time_seconds"
                    name="prep_time_seconds"
                    type="number"
                    min={0}
                    required
                    defaultValue={sp?.prep_time_seconds ?? 30}
                    className={inputCls}
                  />
                </Field>
                <Field label="Response Time (sec)" htmlFor="response_time_seconds" required>
                  <input
                    id="response_time_seconds"
                    name="response_time_seconds"
                    type="number"
                    min={1}
                    required
                    defaultValue={sp?.response_time_seconds ?? 60}
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Difficulty" htmlFor="difficulty" required>
                <select
                  id="difficulty"
                  name="difficulty"
                  required
                  defaultValue={sp?.difficulty ?? "medium"}
                  className={inputCls}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </Field>
            </>
          )}

          {/* ── Writing-only fields ───────────────────────────────────────── */}
          {skill === "writing" && (
            <>
              <Field label="Time Limit (sec)" htmlFor="time_limit_seconds" required>
                <input
                  id="time_limit_seconds"
                  name="time_limit_seconds"
                  type="number"
                  min={60}
                  required
                  defaultValue={wp?.time_limit_seconds ?? 1620}
                  className={inputCls}
                  placeholder="e.g. 1620 = 27 min"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min Words" htmlFor="min_words" required>
                  <input
                    id="min_words"
                    name="min_words"
                    type="number"
                    min={1}
                    required
                    defaultValue={wp?.min_words ?? 150}
                    className={inputCls}
                  />
                </Field>
                <Field label="Max Words" htmlFor="max_words" required>
                  <input
                    id="max_words"
                    name="max_words"
                    type="number"
                    min={1}
                    required
                    defaultValue={wp?.max_words ?? 200}
                    className={inputCls}
                  />
                </Field>
              </div>
            </>
          )}

          {/* ── Active toggle ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <input
              id="is_active"
              name="is_active"
              type="checkbox"
              defaultChecked={sp?.is_active ?? wp?.is_active ?? true}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
            />
            <label htmlFor="is_active" className="text-sm text-foreground font-medium">
              Active (visible to candidates)
            </label>
          </div>
        </form>

        <DialogFooter className="pt-4 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium
                       text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="prompt-form"
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white
                       text-sm font-semibold transition-colors shadow-sm"
          >
            {isEdit ? "Save Changes" : "Add Prompt"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
