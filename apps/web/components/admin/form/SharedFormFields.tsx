"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/admin/form/SharedFormFields.tsx
// Fields common to both speaking and writing prompts:
// task number, title, slug, topic, prompt text, status, sort order,
// band-12 sample response, active toggle.
// ─────────────────────────────────────────────────────────────────────────────

import { Field }    from "@/components/admin/shared/Field";
import { inputCls } from "@/components/admin/shared/inputCls";
import { cn }       from "@/lib/utils";
import type { SpeakingPrompt, WritingPrompt } from "@/lib/types";

type Skill = "speaking" | "writing";

const STATUS_OPTIONS = [
  { value: "draft",     label: "Draft"     },
  { value: "published", label: "Published"  },
  { value: "archived",  label: "Archived"   },
] as const;

interface Props {
  skill:            Skill;
  initial?:         SpeakingPrompt | WritingPrompt;
  /** When set the form is in "task-context" mode — task number,
   *  title, slug, and topic are omitted (they're inferred/optional). */
  lockedTaskNumber?: number;
}

export function SharedFormFields({ skill, initial, lockedTaskNumber }: Props) {
  const isLocked = lockedTaskNumber !== undefined;
  return (
    <>
      {/* Task number — hidden when context-locked */}
      {!isLocked && (
        <Field label="Task Number" htmlFor="task_number" required>
          <input id="task_number" name="task_number" type="number" required
            min={skill === "writing" ? 1 : 0} max={skill === "writing" ? 2 : 8}
            defaultValue={initial?.task_number ?? ""} className={inputCls}
            placeholder={skill === "writing" ? "1 or 2" : "0–8"} />
        </Field>
      )}

      {/* Title / Slug / Topic — hidden in task-context mode */}
      {!isLocked && (
        <>
          <Field label="Title" htmlFor="title" required>
            <input id="title" name="title" type="text" required
              defaultValue={initial?.title ?? ""} className={inputCls}
              placeholder="e.g. Giving Advice" />
          </Field>

          <Field label="Slug" htmlFor="slug" hint="URL-safe identifier. Auto-generated if blank.">
            <input id="slug" name="slug" type="text" pattern="[a-z0-9-]*"
              defaultValue={initial?.slug ?? ""} className={inputCls}
              placeholder="giving-advice" />
          </Field>

          <Field label="Topic" htmlFor="topic">
            <input id="topic" name="topic" type="text"
              defaultValue={initial?.topic ?? ""} className={inputCls}
              placeholder="e.g. Health, Technology" />
          </Field>
        </>
      )}

      <Field label="Prompt Text" htmlFor="prompt_text" required>
        <textarea id="prompt_text" name="prompt_text" rows={4} required
          defaultValue={initial?.prompt_text ?? ""}
          className={cn(inputCls, "resize-y")}
          placeholder="Write the full task prompt shown to candidates…" />
      </Field>

      <Field label="Status" htmlFor="status">
        <select id="status" name="status"
          defaultValue={initial?.status ?? "draft"} className={inputCls}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>

      <Field label="Sort Order" htmlFor="sort_order" hint="Lower numbers appear first.">
        <input id="sort_order" name="sort_order" type="number" min={0}
          defaultValue={initial?.sort_order ?? 0} className={inputCls} />
      </Field>

      <Field label="Band-12 Sample Response" htmlFor="sample_response_band12"
        hint="Shown to candidates after submission. Leave blank to hide.">
        <textarea id="sample_response_band12" name="sample_response_band12" rows={5}
          defaultValue={(initial as (SpeakingPrompt & { sample_response_band12?: string }) | undefined)?.sample_response_band12 ?? ""}
          className={cn(inputCls, "resize-y text-sm")}
          placeholder="Write the ideal band-12 response here…" />
      </Field>

      <div className="flex items-center gap-2">
        <input id="is_active" name="is_active" type="checkbox"
          defaultChecked={initial?.is_active ?? true}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40" />
        <label htmlFor="is_active" className="text-sm text-foreground font-medium">
          Active (visible to candidates)
        </label>
      </div>
    </>
  );
}
