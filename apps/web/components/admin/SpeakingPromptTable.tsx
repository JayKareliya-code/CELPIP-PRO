"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SpeakingPromptTable.tsx — Flat admin table for ALL speaking prompts.
// (Used as a fallback/utility view; main flow uses the per-task grid/detail.)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
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
  return {
    task_number: Number(data.get("task_number")), title: String(data.get("title")),
    prompt_text: String(data.get("prompt_text")),
    prep_time_seconds: Number(data.get("prep_time_seconds")),
    response_time_seconds: Number(data.get("response_time_seconds")),
    difficulty: String(data.get("difficulty")) as SpeakingPromptPayload["difficulty"],
    is_active: data.get("is_active") === "on",
    status: String(data.get("status") || "draft") as SpeakingPromptPayload["status"],
    slug: String(data.get("slug") || "").trim() || null,
    topic: String(data.get("topic") || "").trim() || null,
    sort_order: Number(data.get("sort_order") || 0),
    sample_response_band12: String(data.get("sample_response_band12") || "").trim() || null,
    context_image_url: String(data.get("context_image_url") || "").trim() || null,
  };
}

/** See AdminSpeakingTaskDetail for full docs on the comparison logic. */
function promptHasChanges(payload: SpeakingPromptPayload, original: SpeakingPrompt): boolean {
  const strip = (url: string | null | undefined) =>
    url ? url.split("?")[0].trim() : null;

  const origSampleResponse =
    (original as SpeakingPrompt & { sample_response_text?: string | null })
      .sample_response_text ?? null;

  return (
    payload.prompt_text !== (original.prompt_text ?? "") ||
    payload.task_number !== (original.task_number ?? 0) ||
    payload.title !== (original.title ?? "") ||
    payload.prep_time_seconds !== (original.prep_time_seconds ?? 30) ||
    payload.response_time_seconds !== (original.response_time_seconds ?? 60) ||
    payload.difficulty !== (original.difficulty ?? "medium") ||
    payload.is_active !== (original.is_active ?? true) ||
    payload.status !== (original.status ?? "draft") ||
    (payload.sort_order ?? 0) !== (original.sort_order ?? 0) ||
    (payload.slug ?? null) !== (original.slug ?? null) ||
    (payload.topic ?? null) !== (original.topic ?? null) ||
    strip(payload.context_image_url) !== strip(original.context_image_url) ||
    (payload.sample_response_band12 ?? null) !== (origSampleResponse ?? null)
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

      <PromptFormModal open={modalOpen} skill="speaking" initialPrompt={editTarget} onClose={closeModal} onSave={handleSave} isSaving={create.isPending || update.isPending} />
      <ConfirmModal open={Boolean(deleteTarget)} title="Delete prompt?" description={`"${deleteTarget?.title}" will be permanently removed.`} confirmLabel="Delete" isDestructive
        onCancel={() => setDeleteTarget(undefined)} onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(undefined) }); }} />
    </div>
  );
}
