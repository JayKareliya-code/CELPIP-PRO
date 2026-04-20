"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/admin/form/WritingFormFields.tsx
//
// Writing-specific form fields — mirrors SpeakingFormFields structure.
//   • Difficulty dropdown (easy / medium / hard)
//   • Time limit (seconds)
//   • Min / Max word count
//   • Task type (email / opinion_essay)
// ─────────────────────────────────────────────────────────────────────────────

import { Field }    from "@/components/admin/shared/Field";
import { inputCls } from "@/components/admin/shared/inputCls";
import type { WritingPrompt } from "@/lib/types";

interface Props {
  initial?:    WritingPrompt;
  taskNumber?: number;
}

function defaultTaskType(taskNumber?: number): string {
  if (taskNumber === 2) return "opinion_essay";
  return "email"; // Task 1 default
}

export function WritingFormFields({ initial, taskNumber }: Props) {
  const currentTaskType   = initial?.task_type ?? defaultTaskType(taskNumber);
  const currentDifficulty = initial?.difficulty ?? "medium";

  return (
    <>
      {/* ── Difficulty ────────────────────────────────────────────────── */}
      <Field label="Difficulty" htmlFor="difficulty" required>
        <select id="difficulty" name="difficulty" required
          defaultValue={currentDifficulty} className={inputCls}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </Field>

      {/* ── Task Type ─────────────────────────────────────────────────── */}
      <Field label="Task Type" htmlFor="task_type" required>
        <select id="task_type" name="task_type" required
          defaultValue={currentTaskType} className={inputCls}>
          <option value="email">Email Writing</option>
          <option value="opinion_essay">Opinion Essay</option>
          <option value="survey">Survey Response</option>
        </select>
      </Field>

      {/* ── Timing ────────────────────────────────────────────────────── */}
      <Field label="Time Limit (sec)" htmlFor="time_limit_seconds" required>
        <input id="time_limit_seconds" name="time_limit_seconds" type="number" min={60} required
          defaultValue={initial?.time_limit_seconds ?? 1620} className={inputCls}
          placeholder="e.g. 1620 = 27 min" />
      </Field>

      {/* ── Word range ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Min Words" htmlFor="min_words" required>
          <input id="min_words" name="min_words" type="number" min={1} required
            defaultValue={initial?.min_words ?? 150} className={inputCls} />
        </Field>
        <Field label="Max Words" htmlFor="max_words">
          <input id="max_words" name="max_words" type="number" min={1}
            defaultValue={initial?.max_words ?? 200} className={inputCls}
            placeholder="Leave blank for no limit" />
        </Field>
      </div>
    </>
  );
}
