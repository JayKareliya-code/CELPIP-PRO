// ─────────────────────────────────────────────────────────────────────────────
// CalibrationSampleForm.tsx — Add / Edit calibration sample dialog
//
// Fields: Skill, Task Number, Band Level (1–12), Sample Text, Source, Active.
//
// Bug fixes from code review:
//   1. Uses shared Field component — removes inline label+div duplication.
//   2. Uses shared inputCls — removes locally re-declared class string.
//   3. is_active toggle added — admins can now deactivate a sample from the form.
//   4. handleSubmit does not call onClose — parent manages modal lifecycle.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef }              from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn }                             from "@/lib/utils";
import { Field }                          from "@/components/admin/shared/Field";
import { inputCls }                       from "@/components/admin/shared/inputCls";
import { BAND_MIN, BAND_MAX }             from "@/lib/constants";
import type { CalibrationSample, Skill }  from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CalibrationSampleFormProps {
  open:            boolean;
  initialSample?:  CalibrationSample;
  onClose:         () => void;
  /**
   * Called with the constructed CalibrationSample after validation passes.
   * The parent is responsible for closing the modal after the save completes.
   */
  onSave:          (sample: CalibrationSample) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Controlled dialog for creating or editing a calibration sample.
 *
 * Does not call onClose() inside the submit handler — the parent controls the
 * modal lifecycle so async mutations can complete before dismissal.
 */
export function CalibrationSampleForm({
  open,
  initialSample,
  onClose,
  onSave,
}: CalibrationSampleFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit  = Boolean(initialSample);

  // Reset form on close or when a different sample is loaded for editing.
  useEffect(() => {
    if (!open) formRef.current?.reset();
  }, [open, initialSample?.id]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data   = new FormData(e.currentTarget);
    const sample: CalibrationSample = {
      id:          initialSample?.id ?? crypto.randomUUID(),
      skill:       String(data.get("skill")) as Skill,
      task_number: Number(data.get("task_number")),
      band_level:  Number(data.get("band_level")),
      sample_text: String(data.get("sample_text") ?? "").trim(),
      source:      String(data.get("source") ?? "official").trim() || "official",
      is_active:   data.get("is_active") === "on",
      created_at:  initialSample?.created_at ?? new Date().toISOString(),
    };
    // Do NOT call onClose() here — the parent decides when to close the modal.
    onSave(sample);
  }

  const formKey = `cal-${initialSample?.id ?? "new"}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-full bg-surface border border-border shadow-panel">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            {isEdit ? "Edit" : "Add"} Calibration Sample
          </DialogTitle>
        </DialogHeader>

        <form
          key={formKey}
          ref={formRef}
          id="calibration-form"
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1"
        >
          {/* Skill + Task row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Skill" htmlFor="cal-skill" required>
              <select
                id="cal-skill"
                name="skill"
                required
                defaultValue={initialSample?.skill ?? "speaking"}
                className={inputCls}
              >
                <option value="speaking">Speaking</option>
                <option value="writing">Writing</option>
              </select>
            </Field>

            <Field label="Task #" htmlFor="cal-task" required>
              <input
                id="cal-task"
                name="task_number"
                type="number"
                min={0}
                max={8}
                required
                defaultValue={initialSample?.task_number ?? 1}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Band level */}
          <Field
            label={`Band Level (${BAND_MIN}–${BAND_MAX})`}
            htmlFor="cal-band"
            required
          >
            <input
              id="cal-band"
              name="band_level"
              type="number"
              min={BAND_MIN}
              max={BAND_MAX}
              step={0.5}
              required
              defaultValue={initialSample?.band_level ?? 7}
              className={inputCls}
            />
          </Field>

          {/* Sample text */}
          <Field label="Sample Text" htmlFor="cal-sample-text" required>
            <textarea
              id="cal-sample-text"
              name="sample_text"
              rows={5}
              required
              defaultValue={initialSample?.sample_text ?? ""}
              placeholder="Paste the full text of the calibration sample response…"
              className={cn(inputCls, "resize-y")}
            />
          </Field>

          {/* Source */}
          <Field
            label="Source"
            htmlFor="cal-source"
            hint='E.g. "official", "teacher", "ai"'
          >
            <input
              id="cal-source"
              name="source"
              type="text"
              defaultValue={initialSample?.source ?? "official"}
              placeholder="official"
              className={inputCls}
            />
          </Field>

          {/* Active toggle — previously missing, admins could not deactivate */}
          <div className="flex items-center gap-2">
            <input
              id="cal-is-active"
              name="is_active"
              type="checkbox"
              defaultChecked={initialSample?.is_active ?? true}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
            />
            <label htmlFor="cal-is-active" className="text-sm text-foreground font-medium">
              Active (included in AI calibration set)
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
            form="calibration-form"
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white
                       text-sm font-semibold transition-colors shadow-sm"
          >
            {isEdit ? "Save Changes" : "Add Sample"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
