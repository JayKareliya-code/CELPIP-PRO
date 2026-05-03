// ─────────────────────────────────────────────────────────────────────────────
// lib/admin/promptPayloads.ts
//
// Shared payload builders (FormData → typed payload) extracted from
// AdminSpeakingTaskDetail and AdminWritingTaskDetail so that PromptAnchorTable
// can reuse them without duplicating ~80 lines of parsing logic.
//
// Exported:
//   buildSpeakingPayload(data, taskNumber) → SpeakingPromptPayload
//   buildWritingPayload(data, taskNumber)  → WritingPromptPayload
// ─────────────────────────────────────────────────────────────────────────────

import type { ChoiceOption }              from "@/lib/types";
import type {
  SpeakingPromptPayload,
  WritingPromptPayload,
} from "@/lib/hooks/useAdminPrompts";

// ── Speaking ──────────────────────────────────────────────────────────────────

export function buildSpeakingPayload(
  data:       FormData,
  taskNumber: number,
): SpeakingPromptPayload {
  const rawTitle   = String(data.get("title") || "").trim();
  const promptText = String(data.get("prompt_text") || "");
  const autoTitle  =
    rawTitle ||
    promptText.slice(0, 60).trimEnd() + (promptText.length > 60 ? "..." : "");

  let choice_options:  ChoiceOption[] | null = null;
  let curveball_option: ChoiceOption | null  = null;

  if (taskNumber === 5) {
    try {
      const rawA = String(data.get("choice_option_a") ?? "").trim();
      const rawB = String(data.get("choice_option_b") ?? "").trim();
      const optA: ChoiceOption | null = rawA ? JSON.parse(rawA) : null;
      const optB: ChoiceOption | null = rawB ? JSON.parse(rawB) : null;
      choice_options =
        optA || optB ? ([optA, optB].filter(Boolean) as ChoiceOption[]) : null;
    } catch { /* leave null — backend rejects invalid JSON with 422 */ }

    try {
      const rawCurve = String(data.get("curveball_option") ?? "").trim();
      curveball_option = rawCurve ? JSON.parse(rawCurve) : null;
    } catch { /* leave null */ }
  }

  return {
    task_number:           taskNumber,
    title:                 autoTitle,
    prompt_text:           promptText,
    prep_time_seconds:     Number(data.get("prep_time_seconds")),
    response_time_seconds: Number(data.get("response_time_seconds")),
    difficulty:            String(data.get("difficulty")) as SpeakingPromptPayload["difficulty"],
    is_active:             data.get("is_active") === "on",
    status:                (data.get("status") as SpeakingPromptPayload["status"] | null) ?? undefined,
    slug:                  String(data.get("slug")  || "").trim() || null,
    topic:                 String(data.get("topic") || "").trim() || null,
    sort_order:            Number(data.get("sort_order") || 0),
    sample_response_band12: String(data.get("sample_response_band12") || "").trim() || null,
    ...(data.has("context_image_url")
      ? { context_image_url: String(data.get("context_image_url") || "").trim() || null }
      : {}),
    choice_options,
    curveball_option,
    curveball_instruction_text:
      String(data.get("curveball_instruction_text") ?? "").trim() || null,
    default_choice_index:
      data.get("default_choice_index") !== null
        ? Number(data.get("default_choice_index"))
        : null,
    prompt_tag:
      (data.get("prompt_tag") as "practice" | "mock" | null) ?? "practice",
  };
}

// ── Writing ───────────────────────────────────────────────────────────────────

export function buildWritingPayload(
  data:       FormData,
  taskNumber: number,
): WritingPromptPayload {
  const promptText = String(data.get("prompt_text") || "");
  const rawTitle   = String(data.get("title") || "").trim();
  const title      =
    rawTitle || promptText.slice(0, 60).trim() || `Task ${taskNumber} Prompt`;

  return {
    task_number:        taskNumber,
    title,
    prompt_text:        promptText,
    task_type:          String(
      data.get("task_type") || (taskNumber === 1 ? "email" : "opinion_essay"),
    ),
    time_limit_seconds: Number(data.get("time_limit_seconds")),
    min_words:          Number(data.get("min_words")),
    max_words:          Number(data.get("max_words")) || null,
    difficulty:         String(
      data.get("difficulty") || "medium",
    ) as WritingPromptPayload["difficulty"],
    is_active:          data.get("is_active") === "on",
    status:             String(
      data.get("status") || "draft",
    ) as WritingPromptPayload["status"],
    slug:               String(data.get("slug")  || "").trim() || null,
    topic:              String(data.get("topic") || "").trim() || null,
    sort_order:         Number(data.get("sort_order") || 0),
    sample_response_band12:
      String(data.get("sample_response_band12") || "").trim() || null,
    prompt_tag:         String(
      data.get("prompt_tag") || "practice",
    ) as "practice" | "mock",
  };
}
