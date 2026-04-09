// ─────────────────────────────────────────────────────────────────────────────
// shared/Field.tsx — Reusable labelled form field wrapper for admin forms.
//
// Wraps a label + required indicator + child input in a consistent flex
// column layout. Previously duplicated in PromptFormModal and re-implemented
// inline in CalibrationSampleForm. Now lives here and is used everywhere.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

interface FieldProps {
  /** The visible label text. */
  label: string;
  /** The `id` of the associated `<input>` / `<select>` / `<textarea>`. */
  htmlFor: string;
  /** Shows a red asterisk when true. Defaults to false. */
  required?: boolean;
  /** Optional helper text shown below the label in a subdued style. */
  hint?: string;
  children: ReactNode;
}

/**
 * Labelled field wrapper used in all admin modals.
 *
 * Usage:
 * ```tsx
 * <Field label="Title" htmlFor="title" required>
 *   <input id="title" name="title" ... />
 * </Field>
 * ```
 */
export function Field({ label, htmlFor, required = false, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-foreground">
        {label}
        {required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
      </label>
      {hint && (
        <p className="text-[11px] text-subtle leading-tight -mt-0.5">{hint}</p>
      )}
      {children}
    </div>
  );
}
