"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SpeakingPromptTable.tsx — Flat admin table for ALL speaking prompts.
// (Used as a fallback/utility view; main flow uses the per-task grid/detail.)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import type { ChoiceOption } from "@/lib/types";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PromptFormModal } from "@/components/admin/PromptFormModal";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { EmptyState } from "@/components/common/EmptyState";
import { AddButton } from "@/components/admin/shared/AddButton";
import { PromptActionButtons } from "@/components/admin/shared/PromptActionButtons";
import { cn } from "@/lib/utils";
import { DIFFICULTY_STYLES, STATUS_STYLES } from "@/lib/admin/promptBadges";
import {
  useAdminSpeakingPrompts, useCreateSpeakingPrompt, useUpdateSpeakingPrompt,
  useDeleteSpeakingPrompt, usePublishSpeakingPrompt, useArchiveSpeakingPrompt,
  useToggleActiveSpeakingPrompt,
  type SpeakingPromptPayload,
} from "@/lib/hooks/useAdminPrompts";
import type { SpeakingPrompt } from "@/lib/types";

function toPayload(data: FormData): SpeakingPromptPayload {
  const taskNumber = Number(data.get("task_number"));

  // ── Task 5: parse OptionEditor hidden inputs ──────────────────────────────
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
    task_number: taskNumber,
    title: String(data.get("title")),
    prompt_text: String(data.get("prompt_text")),
    prep_time_seconds: Number(data.get("prep_time_seconds")),
    response_time_seconds: Number(data.get("response_time_seconds")),
    difficulty: String(data.get("difficulty")) as SpeakingPromptPayload["difficulty"],
    is_active: data.get("is_active") === "on",
    // Do NOT fall back to "draft" — omit status if the form didn't submit it
    // so the PATCH schema's exclude_unset leaves the stored DB value untouched.
    status: (data.get("status") as SpeakingPromptPayload["status"] | null) ?? undefined,
    slug: String(data.get("slug") || "").trim() || null,
    topic: String(data.get("topic") || "").trim() || null,
    sort_order: Number(data.get("sort_order") || 0),
    sample_response_band12: String(data.get("sample_response_band12") || "").trim() || null,
    // Only include context_image_url when the image upload widget was rendered
    // (i.e., its hidden input is present in FormData). For non-image tasks the
    // input is absent, so data.get() would return null — sending that as the
    // payload would wipe a stored S3 URL from the DB.
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

/** See AdminSpeakingTaskDetail for full docs on the comparison logic. */
function promptHasChanges(payload: SpeakingPromptPayload, original: SpeakingPrompt): boolean {
  const strip = (url: string | null | undefined) =>
    url ? url.split("?")[0].trim() : null;

  const origSampleResponse =
    (original as SpeakingPrompt & { sample_response_text?: string | null })
      .sample_response_text ?? null;

  const jsonStr = (v: unknown) => (v != null ? JSON.stringify(v) : null);

  return (
    payload.prompt_text !== (original.prompt_text ?? "") ||
    payload.task_number !== (original.task_number ?? 0) ||
    payload.title !== (original.title ?? "") ||
    // No ?? 30 / ?? 60 hardcoded fallbacks: compare directly so a genuine
    // undefined original doesn't produce a false-positive change signal.
    payload.prep_time_seconds !== original.prep_time_seconds ||
    payload.response_time_seconds !== original.response_time_seconds ||
    payload.difficulty !== (original.difficulty ?? "medium") ||
    payload.is_active !== (original.is_active ?? true) ||
    (payload.status !== undefined && payload.status !== (original.status ?? "draft")) ||
    (payload.sort_order ?? 0) !== (original.sort_order ?? 0) ||
    (payload.slug ?? null) !== (original.slug ?? null) ||
    (payload.topic ?? null) !== (original.topic ?? null) ||
    strip(payload.context_image_url) !== strip(original.context_image_url) ||
    (payload.sample_response_band12 ?? null) !== (origSampleResponse ?? null) ||
    jsonStr(payload.choice_options) !== jsonStr(original.choice_options ?? null) ||
    jsonStr(payload.curveball_option) !== jsonStr(original.curveball_option ?? null) ||
    (payload.curveball_instruction_text ?? null) !== (original.curveball_instruction_text ?? null) ||
    (payload.default_choice_index ?? null) !== (original.default_choice_index ?? null) ||
    (payload.prompt_tag ?? "practice") !== ((original as SpeakingPrompt & { prompt_tag?: string }).prompt_tag ?? "practice")
  );
}

export function SpeakingPromptTable() {
  const [editTarget, setEditTarget] = useState<SpeakingPrompt | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<SpeakingPrompt | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: prompts = [], isLoading, isError } = useAdminSpeakingPrompts();
  const create = useCreateSpeakingPrompt(); const update = useUpdateSpeakingPrompt();
  const remove = useDeleteSpeakingPrompt(); const publish = usePublishSpeakingPrompt();
  const archive = useArchiveSpeakingPrompt();
  const toggleActive = useToggleActiveSpeakingPrompt();
  const isMutating = create.isPending || update.isPending || remove.isPending || publish.isPending || archive.isPending || toggleActive.isPending;

  const openCreate = useCallback(() => { setEditTarget(undefined); setModalOpen(true); }, []);
  const openEdit = useCallback((p: SpeakingPrompt) => { setEditTarget(p); setModalOpen(true); }, []);
  const closeModal = useCallback(() => { setModalOpen(false); setEditTarget(undefined); }, []);

  function handleSave(data: FormData) {
    const payload = toPayload(data);

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

  if (isLoading) return <div className="flex items-center justify-center h-40 gap-2 text-subtle text-sm"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>;
  if (isError) return <div className="text-danger text-sm text-center py-10">Failed to load speaking prompts.</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><AddButton id="add-speaking-prompt-btn" label="Add Prompt" onClick={openCreate} disabled={isMutating} /></div>

      {prompts.length === 0 ? <EmptyState title="No speaking prompts yet" description="Add your first speaking prompt to get started." /> : (
        <div className="rounded-xl border border-border overflow-hidden shadow-card bg-surface">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-16 text-center">Task</TableHead><TableHead>Title</TableHead>
                <TableHead className="w-20 text-center hidden sm:table-cell">Prep</TableHead>
                <TableHead className="w-24 text-center hidden sm:table-cell">Resp</TableHead>
                <TableHead className="w-24 hidden md:table-cell">Difficulty</TableHead>
                <TableHead className="w-24 hidden lg:table-cell">Pool</TableHead>
                <TableHead className="w-28 hidden lg:table-cell">Status</TableHead>
                <TableHead className="w-20 text-center">Active</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.map((p) => (
                <TableRow key={p.id} className="group hover:bg-muted/50">
                  <TableCell className="text-center"><Badge variant="outline" className="text-xs font-semibold">{p.task_number === 0 ? "P" : p.task_number}</Badge></TableCell>
                  <TableCell className="font-medium text-sm text-foreground max-w-xs truncate">{p.title}</TableCell>
                  <TableCell className="text-center text-xs text-subtle hidden sm:table-cell">{p.prep_time_seconds}s</TableCell>
                  <TableCell className="text-center text-xs text-subtle hidden sm:table-cell">{p.response_time_seconds}s</TableCell>
                  <TableCell className="hidden md:table-cell"><span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border", DIFFICULTY_STYLES[p.difficulty] ?? "bg-muted text-subtle")}>{p.difficulty}</span></TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                      (p as SpeakingPrompt & { prompt_tag?: string }).prompt_tag === "mock"
                        ? "bg-indigo-900/30 border-indigo-700/40 text-indigo-300"
                        : "bg-emerald-900/30 border-emerald-700/40 text-emerald-300"
                    )}>
                      {(p as SpeakingPrompt & { prompt_tag?: string }).prompt_tag === "mock" ? "Mock" : "Practice"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell"><span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border", STATUS_STYLES[p.status ?? "draft"] ?? "bg-muted text-subtle")}>{p.status ?? "draft"}</span></TableCell>
                  <TableCell className="text-center">
                    <PromptActionButtons status={p.status} isActive={p.is_active} isMutating={isMutating}
                      onEdit={() => openEdit(p)} onDelete={() => setDeleteTarget(p)}
                      onToggleActive={() => toggleActive.mutate(p.id)}
                      onPublish={() => publish.mutate(p.id)} onArchive={() => archive.mutate(p.id)} />
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/*
        lockedTaskNumber is passed even though the table isn't locked to a single task.
        For edit mode this ensures SpeakingFormFields only renders the image upload widget when
        the edited prompt is actually an image task (3, 4, 8), preventing a null context_image_url
        being submitted to the PATCH endpoint for non-image tasks.
        For create mode (editTarget = undefined) we pass undefined, which keeps the task selector
        visible so the admin can choose any task number.
      */}
      <PromptFormModal
        open={modalOpen}
        skill="speaking"
        initialPrompt={editTarget}
        onClose={closeModal}
        onSave={handleSave}
        isSaving={create.isPending || update.isPending}
        lockedTaskNumber={editTarget?.task_number}
      />
      <ConfirmModal open={Boolean(deleteTarget)} title="Delete prompt?" description={`"${deleteTarget?.title}" will be permanently removed.`} confirmLabel="Delete" isDestructive
        onCancel={() => setDeleteTarget(undefined)} onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(undefined) }); }} />
    </div>
  );
}
