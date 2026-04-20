"use client";

// AdminSpeakingTaskDetail.tsx -- Thin orchestrator for /admin/prompts/speaking/[task].
// Composes: SpeakingTaskHeader + SpeakingPromptsTable + modals.

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
import type { SpeakingPrompt, ChoiceOption } from "@/lib/types";

// -- Payload builder ----------------------------------------------------------

function toPayload(data: FormData, taskNumber: number): SpeakingPromptPayload {
  const rawTitle   = String(data.get("title") || "").trim();
  const promptText = String(data.get("prompt_text") || "");
  const autoTitle  = rawTitle || promptText.slice(0, 60).trimEnd() + (promptText.length > 60 ? "..." : "");

  // Task 5: OptionEditor serialises state into hidden inputs:
  //   choice_option_a  -> JSON string for Option A
  //   choice_option_b  -> JSON string for Option B
  //   curveball_option -> JSON string for the curveball
  let choice_options: ChoiceOption[] | null = null;
  let curveball_option: ChoiceOption | null = null;

  if (taskNumber === 5) {
    try {
      const rawA = String(data.get("choice_option_a") ?? "").trim();
      const rawB = String(data.get("choice_option_b") ?? "").trim();
      const optA: ChoiceOption | null = rawA ? JSON.parse(rawA) : null;
      const optB: ChoiceOption | null = rawB ? JSON.parse(rawB) : null;
      choice_options = (optA || optB) ? [optA, optB].filter(Boolean) as ChoiceOption[] : null;
    } catch { /* leave null -- backend rejects invalid JSON with 422 */ }

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
    status: (data.get("status") as SpeakingPromptPayload["status"] | null) ?? undefined,
    slug:                    String(data.get("slug")  || "").trim() || null,
    topic:                   String(data.get("topic") || "").trim() || null,
    sort_order:              Number(data.get("sort_order") || 0),
    sample_response_band12:  String(data.get("sample_response_band12") || "").trim() || null,
    ...(data.has("context_image_url")
      ? { context_image_url: String(data.get("context_image_url") || "").trim() || null }
      : {}),
    choice_options,
    curveball_option,
    curveball_instruction_text: String(data.get("curveball_instruction_text") ?? "").trim() || null,
    default_choice_index: data.get("default_choice_index") !== null
      ? Number(data.get("default_choice_index"))
      : null,
    prompt_tag: (data.get("prompt_tag") as "practice" | "mock" | null) ?? "practice",
  };
}

// -- Change detection ---------------------------------------------------------

function promptHasChanges(
  payload:  SpeakingPromptPayload,
  original: SpeakingPrompt,
): boolean {
  const strip = (url: string | null | undefined) =>
    url ? url.split("?")[0].trim() : null;

  type WithSampleFields = SpeakingPrompt & {
    sample_response_text?:   string | null;
    sample_response_band12?: string | null;
  };
  const origSampleResponse =
    (original as WithSampleFields).sample_response_text ??
    (original as WithSampleFields).sample_response_band12 ??
    null;

  const jsonStr = (v: unknown) => (v != null ? JSON.stringify(v) : null);

  return (
    payload.title                   !== (original.title               ?? "")       ||
    payload.prompt_text             !== (original.prompt_text         ?? "")       ||
    payload.prep_time_seconds       !==  original.prep_time_seconds                ||
    payload.response_time_seconds   !==  original.response_time_seconds            ||
    payload.difficulty              !== (original.difficulty          ?? "medium") ||
    payload.is_active               !== (original.is_active           ?? true)     ||
    (payload.status !== undefined && payload.status !== (original.status ?? "draft")) ||
    (payload.sort_order   ?? 0)     !== (original.sort_order          ?? 0)        ||
    (payload.slug         ?? null)  !== (original.slug                ?? null)     ||
    (payload.topic        ?? null)  !== (original.topic               ?? null)     ||
    strip(payload.context_image_url)         !== strip(original.context_image_url) ||
    (payload.sample_response_band12 ?? null) !== (origSampleResponse  ?? null)    ||
    jsonStr(payload.choice_options)              !== jsonStr(original.choice_options              ?? null) ||
    jsonStr(payload.curveball_option)            !== jsonStr(original.curveball_option            ?? null) ||
    (payload.curveball_instruction_text ?? null) !== (original.curveball_instruction_text         ?? null) ||
    (payload.default_choice_index       ?? null) !== (original.default_choice_index               ?? null) ||
    (payload.prompt_tag ?? "practice")           !== ((original as SpeakingPrompt & { prompt_tag?: string }).prompt_tag ?? "practice")
  );
}

// -- Component ----------------------------------------------------------------

interface Props { taskNumber: number }

export function AdminSpeakingTaskDetail({ taskNumber }: Props) {
  const [editTarget,   setEditTarget]   = useState<SpeakingPrompt | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<SpeakingPrompt | undefined>(undefined);
  const [modalOpen,    setModalOpen]    = useState(false);

  const { data: allPrompts = [], isLoading, isError } = useAdminSpeakingPrompts();
  const prompts = useMemo(
    () => allPrompts.filter((p) => p.task_number === taskNumber),
    [allPrompts, taskNumber],
  );

  const create       = useCreateSpeakingPrompt();
  const update       = useUpdateSpeakingPrompt();
  const remove       = useDeleteSpeakingPrompt();
  const publish      = usePublishSpeakingPrompt();
  const archive      = useArchiveSpeakingPrompt();
  const toggleActive = useToggleActiveSpeakingPrompt();

  const isMutating =
    create.isPending || update.isPending || remove.isPending ||
    publish.isPending || archive.isPending || toggleActive.isPending;

  const openCreate = useCallback(() => { setEditTarget(undefined); setModalOpen(true); }, []);
  const openEdit   = useCallback((p: SpeakingPrompt) => { setEditTarget(p); setModalOpen(true); }, []);
  const closeModal = useCallback(() => { setModalOpen(false); setEditTarget(undefined); }, []);

  function handleSave(data: FormData) {
    const payload = toPayload(data, taskNumber);
    if (editTarget) {
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
    toggleActive.mutate(p.id);
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-40 gap-2 text-subtle text-sm">
      <Loader2 className="w-4 h-4 animate-spin" />Loading...
    </div>
  );
  if (isError) return (
    <div className="text-danger text-sm text-center py-10">Failed to load prompts.</div>
  );

  return (
    <div className="space-y-6">
      <SpeakingTaskHeader
        taskNumber={taskNumber}
        promptCount={prompts.length}
        isMutating={isMutating}
        onAdd={openCreate}
      />

      {prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 rounded-2xl border-2 border-dashed border-border">
          <p className="text-subtle text-sm">No prompts for Task {taskNumber} yet.</p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Add First Prompt
          </button>
        </div>
      ) : (
        <SpeakingPromptsTable
          prompts={prompts}
          isMutating={isMutating}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onToggleActive={handleToggleActive}
          onPublish={(id) => publish.mutate(id)}
          onArchive={(id) => archive.mutate(id)}
        />
      )}

      <PromptFormModal
        open={modalOpen}
        skill="speaking"
        initialPrompt={editTarget}
        onClose={closeModal}
        onSave={handleSave}
        isSaving={create.isPending || update.isPending}
        lockedTaskNumber={taskNumber}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete prompt?"
        description="This prompt will be permanently removed. Consider archiving instead."
        confirmLabel="Delete"
        isDestructive
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(undefined),
          });
        }}
      />
    </div>
  );
}