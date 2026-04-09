"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/admin/form/WritingFormFields.tsx
// Writing-specific fields: time limit, min/max words.
// ─────────────────────────────────────────────────────────────────────────────

import { Field }    from "@/components/admin/shared/Field";
import { inputCls } from "@/components/admin/shared/inputCls";
import type { WritingPrompt } from "@/lib/types";

interface Props { initial?: WritingPrompt }

export function WritingFormFields({ initial }: Props) {
  return (
    <>
      <Field label="Time Limit (sec)" htmlFor="time_limit_seconds" required>
        <input id="time_limit_seconds" name="time_limit_seconds" type="number" min={60} required
          defaultValue={initial?.time_limit_seconds ?? 1620} className={inputCls}
          placeholder="e.g. 1620 = 27 min" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Min Words" htmlFor="min_words" required>
          <input id="min_words" name="min_words" type="number" min={1} required
            defaultValue={initial?.min_words ?? 150} className={inputCls} />
        </Field>
        <Field label="Max Words" htmlFor="max_words" required>
          <input id="max_words" name="max_words" type="number" min={1} required
            defaultValue={initial?.max_words ?? 200} className={inputCls} />
        </Field>
      </div>
    </>
  );
}
