// ─────────────────────────────────────────────────────────────────────────────
// CalibrationSampleForm.tsx — Add / Edit calibration sample dialog
//
// Fields: Skill, Task Number, Band Level (1–12), Sample Text, Source.
// Uses shadcn/ui Dialog + native <form>.
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
import { BAND_MIN, BAND_MAX }             from "@/lib/constants";
import type { CalibrationSample, Skill }  from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CalibrationSampleFormProps {
  open:            boolean;
  initialSample?:  CalibrationSample;
  onClose:         () => void;
  onSave:          (sample: CalibrationSample) => void;
}

// ── Shared input class ────────────────────────────────────────────────────────

const inputCls = cn(
  "w-full rounded-lg border border-border bg-muted px-3 py-2",
  "text-sm text-foreground placeholder:text-subtle/60",
  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
  "transition-colors duration-150"
);

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Controlled dialog for creating or editing a calibration sample.
 */
export function CalibrationSampleForm({
  open,
  initialSample,
  onClose,
  onSave,
}: CalibrationSampleFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit  = Boolean(initialSample);

  useEffect(() => {
    if (!open) formRef.current?.reset();
  }, [open, initialSample]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data   = new FormData(e.currentTarget);
    const sample: CalibrationSample = {
      id:          initialSample?.id ?? `cal-${Date.now()}`,
      skill:       String(data.get("skill")) as Skill,
      task_number: Number(data.get("task_number")),
      band_level:  Number(data.get("band_level")),
      sample_text: String(data.get("sample_text") ?? "").trim(),
      source:      String(data.get("source") ?? "official").trim() || "official",
      is_active:   initialSample?.is_active ?? true,
      created_at:  initialSample?.created_at ?? new Date().toISOString(),
    };
    onSave(sample);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-full bg-surface border border-border shadow-panel">
        <DialogHeader className="flex flex-row items-start justify-between gap-2 pb-0">
          <DialogTitle className="text-base font-bold text-foreground">
            {isEdit ? "Edit" : "Add"} Calibration Sample
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
          id="calibration-form"
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1"
        >
          {/* Skill + Task row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cal-skill" className="text-xs font-semibold text-foreground">
                Skill <span className="text-danger">*</span>
              </label>
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
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cal-task" className="text-xs font-semibold text-foreground">
                Task # <span className="text-danger">*</span>
              </label>
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
            </div>
          </div>

          {/* Band level */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cal-band" className="text-xs font-semibold text-foreground">
              Band Level ({BAND_MIN}–{BAND_MAX}) <span className="text-danger">*</span>
            </label>
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
          </div>

          {/* Sample text */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cal-sample-text" className="text-xs font-semibold text-foreground">
              Sample Text <span className="text-danger">*</span>
            </label>
            <textarea
              id="cal-sample-text"
              name="sample_text"
              rows={5}
              required
              defaultValue={initialSample?.sample_text ?? ""}
              placeholder="Paste the full text of the calibration sample response…"
              className={cn(inputCls, "resize-y")}
            />
          </div>

          {/* Source */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cal-source" className="text-xs font-semibold text-foreground">
              Source <span className="text-subtle font-normal">(e.g. "official", "teacher", "ai")</span>
            </label>
            <input
              id="cal-source"
              name="source"
              type="text"
              defaultValue={initialSample?.source ?? "official"}
              placeholder="official"
              className={inputCls}
            />
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
