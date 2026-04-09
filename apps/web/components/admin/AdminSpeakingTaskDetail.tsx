"use client";

// ─────────────────────────────────────────────────────────────────────────────
// AdminSpeakingTaskDetail.tsx — Thin orchestrator for /admin/prompts/speaking/[task].
// Composes: SpeakingTaskHeader + SpeakingPromptsTable + modals.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from "react";
import { Loader2, Plus }    from "lucide-react";
import { toast }            from "sonner";
import { PromptFormModal }  from "@/components/admin/PromptFormModal";
import { ConfirmModal }     from "@/components/common/ConfirmModal";
import { SpeakingTaskHeader }   from "./speaking/SpeakingTaskHeader";
import { SpeakingPromptsTable } from "./speaking/SpeakingPromptsTable";
import {
  useAdminSpeakingPrompts,
  useCreateSpeakingPrompt,
  useUpdateSpeakingPrompt,
  useDeleteSpeakingPrompt,
  usePublishSpeakingPrompt,
  useArchiveSpeakingPrompt,
  useToggleActiveSpeakingPrompt,
  type SpeakingPromptPayload,
} from "@/lib/hooks/useAdminPrompts";
import type { SpeakingPrompt } from "@/lib/types";

function toPayload(data: FormData, taskNumber: number): SpeakingPromptPayload {
  // When in task-context mode the form has no title field — derive one from prompt text.
  const rawTitle   = String(data.get("title") || "").trim();
  const promptText = String(data.get("prompt_text") || "");
  const autoTitle  = rawTitle || promptText.slice(0, 60).trimEnd() + (promptText.length > 60 ? "…" : "");

  // ── Task 5: parse Option A + Option B JSON textareas into choice_options[] ──
  let choice_options: unknown[] | null = null;
  let curveball_option: Record<string, unknown> | null = null;
  if (taskNumber === 5) {
    try {
      const rawA = String(data.get("choice_option_a") ?? "").trim();
      const rawB = String(data.get("choice_option_b") ?? "").trim();
      const optA = rawA ? JSON.parse(rawA) : null;
      const optB = rawB ? JSON.parse(rawB) : null;
      choice_options = (optA || optB) ? [optA, optB].filter(Boolean) : null;
    } catch { /* leave null — backend rejects invalid JSON */ }

    try {
      const rawCurve = String(data.get("curveball_option") ?? "").trim();
      curveball_option = rawCurve ? JSON.parse(rawCurve) : null;
    } catch { /* leave null */ }
  }

  return {
    task_number:             taskNumber,
    title:                   autoTitle,
    prompt_text:             promptText,
    prep_time_seconds:       Number(data.get("prep_time_seconds")),
    response_time_seconds:   Number(data.get("response_time_seconds")),
    difficulty:              String(data.get("difficulty")) as SpeakingPromptPayload["difficulty"],
    is_active:               data.get("is_active") === "on",
    status:                  String(data.get("status") || "draft") as SpeakingPromptPayload["status"],
    slug:                    String(data.get("slug")  || "").trim() || null,
    topic:                   String(data.get("topic") || "").trim() || null,
    sort_order:              Number(data.get("sort_order") || 0),
    sample_response_band12:  String(data.get("sample_response_band12") || "").trim() || null,
    // Image-based tasks (3, 4, 8) — null when not provided
    context_image_url:       String(data.get("context_image_url") || "").trim() || null,
    // Task 5 fields
    choice_options:             choice_options as SpeakingPromptPayload["choice_options"] ?? null,
    curveball_option:           curveball_option as SpeakingPromptPayload["curveball_option"] ?? null,
    curveball_instruction_text: String(data.get("curveball_instruction_text") ?? "").trim() || null,
    default_choice_index:       data.get("default_choice_index") !== null
      ? Number(data.get("default_choice_index"))
      : null,
  };
}

/**
 * Returns true if any editable field in the payload differs from the original
 * SpeakingPrompt. Used to skip the PATCH call when nothing has changed.
 *
 * Notes:
 *  - context_image_url: the list API returns a presigned URL in the prompt
 *    object, but the form stores the clean path URL (no X-Amz-* params).
 *    We strip query params from both sides before comparing.
 *  - sample_response_text: the backend ORM field is sample_response_text,
 *    but we also accept sample_response_band12 as a fallback (older cache).
 */
function promptHasChanges(payload: SpeakingPromptPayload, original: SpeakingPrompt): boolean {
  const strip = (url: string | null | undefined) =>
    url ? url.split("?")[0].trim() : null;

  // The backend returns sample_response_text; cast for comparison.
  const origSampleResponse =
    (original as SpeakingPrompt & { sample_response_text?: string | null; sample_response_band12?: string | null })
      .sample_response_text ??
    (original as SpeakingPrompt & { sample_response_band12?: string | null })
      .sample_response_band12 ??
    null;

  // Task 5: compare JSON fields as serialised strings (order-stable for admin use)
  const jsonStr = (v: unknown) => (v != null ? JSON.stringify(v) : null);

  return (
    payload.prompt_text             !== (original.prompt_text           ?? "")        ||
    payload.prep_time_seconds       !== (original.prep_time_seconds     ?? 30)        ||
    payload.response_time_seconds   !== (original.response_time_seconds ?? 60)        ||
    payload.difficulty              !== (original.difficulty            ?? "medium")  ||
    payload.is_active               !== (original.is_active             ?? true)      ||
    payload.status                  !== (original.status                ?? "draft")   ||
    (payload.sort_order   ?? 0)     !== (original.sort_order            ?? 0)         ||
    (payload.slug         ?? null)  !== (original.slug                  ?? null)      ||
    (payload.topic        ?? null)  !== (original.topic                 ?? null)      ||
    strip(payload.context_image_url)    !== strip(original.context_image_url)          ||
    (payload.sample_response_band12 ?? null) !== (origSampleResponse   ?? null)      ||
    // ── Task 5 fields ─────────────────────────────────────────────────────────
    jsonStr(payload.choice_options)             !== jsonStr(original.choice_options             ?? null) ||
    jsonStr(payload.curveball_option)           !== jsonStr(original.curveball_option           ?? null) ||
    (payload.curveball_instruction_text ?? null) !== (original.curveball_instruction_text      ?? null) ||
    (payload.default_choice_index ?? null)       !== (original.default_choice_index            ?? null)
  );
}




interface Props { taskNumber: number }

export function AdminSpeakingTaskDetail({ taskNumber }: Props) {
  const [editTarget,   setEditTarget]   = useState<SpeakingPrompt | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<SpeakingPrompt | undefined>(undefined);
  const [modalOpen,    setModalOpen]    = useState(false);

  const { data: allPrompts = [], isLoading, isError } = useAdminSpeakingPrompts();
  const prompts = useMemo(() => allPrompts.filter((p) => p.task_number === taskNumber), [allPrompts, taskNumber]);

  const create       = useCreateSpeakingPrompt();
  const update       = useUpdateSpeakingPrompt();
  const remove       = useDeleteSpeakingPrompt();
  const publish      = usePublishSpeakingPrompt();
  const archive      = useArchiveSpeakingPrompt();
  const toggleActive = useToggleActiveSpeakingPrompt();

  const isMutating = create.isPending || update.isPending || remove.isPending || publish.isPending || archive.isPending || toggleActive.isPending;

  const openCreate = useCallback(() => { setEditTarget(undefined); setModalOpen(true); }, []);
  const openEdit   = useCallback((p: SpeakingPrompt) => { setEditTarget(p); setModalOpen(true); }, []);
  const closeModal = useCallback(() => { setModalOpen(false); setEditTarget(undefined); }, []);

  function handleSave(data: FormData) {
    const payload = toPayload(data, taskNumber);

    if (editTarget) {
      // ── Edit mode: skip the API call entirely if nothing changed ──────────
      if (!promptHasChanges(payload, editTarget)) {
        toast.info("No changes to save.");
        closeModal();
        return;
      }
      update.mutate({ id: editTarget.id, payload }, { onSuccess: closeModal });
    } else {
      create.mutate(payload, { onSuccess: closeModal });
    }
  }

  function handleToggleActive(p: SpeakingPrompt) {
    // Uses the dedicated /toggle-active endpoint — only flips is_active,
    // zero risk of corrupting status, context_image_url, or any other field.
    toggleActive.mutate(p.id);
  }

  if (isLoading) return <div className="flex items-center justify-center h-40 gap-2 text-subtle text-sm"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>;
  if (isError)   return <div className="text-danger text-sm text-center py-10">Failed to load prompts.</div>;

  return (
    <div className="space-y-6">
      <SpeakingTaskHeader taskNumber={taskNumber} promptCount={prompts.length} isMutating={isMutating} onAdd={openCreate} />

      {prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 rounded-2xl border-2 border-dashed border-border">
          <p className="text-subtle text-sm">No prompts for Task {taskNumber} yet.</p>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Add First Prompt
          </button>
        </div>
      ) : (
        <SpeakingPromptsTable
          prompts={prompts} isMutating={isMutating}
          onEdit={openEdit} onDelete={setDeleteTarget}
          onToggleActive={handleToggleActive}
          onPublish={(id) => publish.mutate(id)}
          onArchive={(id) => archive.mutate(id)}
        />
      )}

      <PromptFormModal open={modalOpen} skill="speaking" initialPrompt={editTarget}
        onClose={closeModal} onSave={handleSave} isSaving={create.isPending || update.isPending}
        lockedTaskNumber={taskNumber} />

      <ConfirmModal open={Boolean(deleteTarget)} title="Delete prompt?"
        description="This prompt will be permanently removed. Consider archiving instead."
        confirmLabel="Delete" isDestructive
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(undefined) }); }} />
    </div>
  );
}
