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

const PROMPT_TAG_OPTIONS = [
  {
    value: "practice",
    label: "Practice",
    description: "Served in individual task attempts",
  },
  {
    value: "mock",
    label: "Mock Exam",
    description: "Served in full mock exam sessions only",
  },
] as const;

/**
 * Read the band-12 sample response text from either the DB column name
 * (sample_response_text, as returned by to_dict) or the frontend alias
 * (sample_response_band12). The backend remaps the field in _remap() on save
 * but the GET response uses the DB column name.
 */
function getSampleResponse(prompt?: SpeakingPrompt | WritingPrompt): string {
  if (!prompt) return "";
  const p = prompt as unknown as Record<string, unknown>;
  return String(p.sample_response_band12 ?? p.sample_response_text ?? "");
}

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

      {/* Title / Slug / Topic — hidden in task-context (locked) mode for all skills */}
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
          defaultValue={getSampleResponse(initial)}
          className={cn(inputCls, "resize-y text-sm")}
          placeholder="Write the ideal band-12 response here…" />
      </Field>

      {/* Prompt Pool — controls which pool this prompt belongs to */}
      <Field
        label="Prompt Pool"
        htmlFor="prompt_tag"
        hint="Controls whether this prompt appears in individual practice or the mock exam."
      >
        <div className="flex gap-2">
          {PROMPT_TAG_OPTIONS.map((opt) => {
            // We render a hidden radio input + styled label so FormData picks it up
            const defaultChecked =
              (initial as SpeakingPrompt & { prompt_tag?: string })?.prompt_tag === opt.value ||
              (!(initial as SpeakingPrompt & { prompt_tag?: string })?.prompt_tag && opt.value === "practice");
            return (
              <label
                key={opt.value}
                htmlFor={`prompt_tag_${opt.value}`}
                className={cn(
                  "flex-1 flex flex-col gap-0.5 cursor-pointer rounded-lg border px-3 py-2.5",
                  "transition-all duration-150 select-none",
                  "has-[:checked]:border-primary has-[:checked]:bg-primary/8 has-[:checked]:text-primary",
                  "border-border hover:border-primary/50",
                )}
              >
                <input
                  type="radio"
                  id={`prompt_tag_${opt.value}`}
                  name="prompt_tag"
                  value={opt.value}
                  defaultChecked={defaultChecked}
                  className="sr-only"
                />
                <span className="text-sm font-semibold">{opt.label}</span>
                <span className="text-xs text-subtle">{opt.description}</span>
              </label>
            );
          })}
        </div>
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
