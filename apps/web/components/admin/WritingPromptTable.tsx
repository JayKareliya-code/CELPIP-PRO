"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WritingPromptTable.tsx (~130 lines) — Admin table for writing prompts.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { Loader2 }         from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge }           from "@/components/ui/badge";
import { PromptFormModal } from "@/components/admin/PromptFormModal";
import { ConfirmModal }    from "@/components/common/ConfirmModal";
import { EmptyState }      from "@/components/common/EmptyState";
import { AddButton }       from "@/components/admin/shared/AddButton";
import { PromptActionButtons } from "@/components/admin/shared/PromptActionButtons";
import { cn }              from "@/lib/utils";
import { formatTime }      from "@/lib/utils";
import { STATUS_STYLES }   from "@/lib/admin/promptBadges";
import {
  useAdminWritingPrompts, useCreateWritingPrompt, useUpdateWritingPrompt,
  useDeleteWritingPrompt, usePublishWritingPrompt, useArchiveWritingPrompt,
  type WritingPromptPayload,
} from "@/lib/hooks/useAdminPrompts";
import type { WritingPrompt } from "@/lib/types";

function toPayload(data: FormData): WritingPromptPayload {
  return {
    task_number: Number(data.get("task_number")), title: String(data.get("title")),
    prompt_text: String(data.get("prompt_text")), task_type: "email",
    time_limit_seconds: Number(data.get("time_limit_seconds")),
    min_words: Number(data.get("min_words")), max_words: Number(data.get("max_words")) || null,
    difficulty: String(data.get("difficulty") || "medium") as WritingPromptPayload["difficulty"],
    is_active:  data.get("is_active") === "on",
    status:     String(data.get("status") || "draft") as WritingPromptPayload["status"],
    slug:       String(data.get("slug")  || "").trim() || null,
    topic:      String(data.get("topic") || "").trim() || null,
    sort_order: Number(data.get("sort_order") || 0),
    sample_response_band12: String(data.get("sample_response_band12") || "").trim() || null,
  };
}

function togglePayload(p: WritingPrompt): WritingPromptPayload {
  return { task_number: p.task_number, title: p.title, prompt_text: p.prompt_text,
    task_type: "email", time_limit_seconds: p.time_limit_seconds, min_words: p.min_words,
    max_words: p.max_words, difficulty: "medium", is_active: !p.is_active,
    status: (p.status ?? "draft") as WritingPromptPayload["status"],
    slug: p.slug, topic: p.topic, sort_order: p.sort_order };
}

export function WritingPromptTable() {
  const [editTarget,   setEditTarget]   = useState<WritingPrompt | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<WritingPrompt | undefined>(undefined);
  const [modalOpen,    setModalOpen]    = useState(false);

  const { data: prompts = [], isLoading, isError } = useAdminWritingPrompts();
  const create  = useCreateWritingPrompt();  const update  = useUpdateWritingPrompt();
  const remove  = useDeleteWritingPrompt();  const publish = usePublishWritingPrompt();
  const archive = useArchiveWritingPrompt();
  const isMutating = create.isPending || update.isPending || remove.isPending || publish.isPending || archive.isPending;

  const openCreate = useCallback(() => { setEditTarget(undefined); setModalOpen(true); }, []);
  const openEdit   = useCallback((p: WritingPrompt) => { setEditTarget(p); setModalOpen(true); }, []);
  const closeModal = useCallback(() => { setModalOpen(false); setEditTarget(undefined); }, []);

  function handleSave(data: FormData) {
    const payload = toPayload(data);
    if (editTarget) {
      update.mutate({ id: editTarget.id, payload }, { onSuccess: closeModal });
    } else {
      create.mutate(payload, { onSuccess: closeModal });
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-40 gap-2 text-subtle text-sm"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>;
  if (isError)   return <div className="text-danger text-sm text-center py-10">Failed to load writing prompts.</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><AddButton id="add-writing-prompt-btn" label="Add Prompt" onClick={openCreate} disabled={isMutating} /></div>

      {prompts.length === 0 ? <EmptyState title="No writing prompts yet" description="Add your first writing prompt to get started." /> : (
        <div className="rounded-xl border border-border overflow-hidden shadow-card bg-surface">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-16 text-center">Task</TableHead><TableHead>Title</TableHead>
                <TableHead className="w-24 text-center hidden sm:table-cell">Time</TableHead>
                <TableHead className="w-32 text-center hidden md:table-cell">Words</TableHead>
                <TableHead className="w-28 hidden lg:table-cell">Status</TableHead>
                <TableHead className="w-20 text-center">Active</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.map((p) => (
                <TableRow key={p.id} className="group hover:bg-muted/50">
                  <TableCell className="text-center"><Badge variant="outline" className="text-xs font-semibold">{p.task_number}</Badge></TableCell>
                  <TableCell className="font-medium text-sm text-foreground max-w-xs truncate">{p.title}</TableCell>
                  <TableCell className="text-center text-xs text-subtle hidden sm:table-cell">{formatTime(p.time_limit_seconds)}</TableCell>
                  <TableCell className="text-center text-xs text-subtle hidden md:table-cell">{p.min_words}–{p.max_words ?? "∞"} words</TableCell>
                  <TableCell className="hidden lg:table-cell"><span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border", STATUS_STYLES[p.status ?? "draft"] ?? "bg-muted text-subtle")}>{p.status ?? "draft"}</span></TableCell>
                  <TableCell className="text-center">
                    <PromptActionButtons status={p.status} isActive={p.is_active} isMutating={isMutating}
                      onEdit={() => openEdit(p)} onDelete={() => setDeleteTarget(p)}
                      onToggleActive={() => update.mutate({ id: p.id, payload: togglePayload(p) })}
                      onPublish={() => publish.mutate(p.id)} onArchive={() => archive.mutate(p.id)} />
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PromptFormModal open={modalOpen} skill="writing" initialPrompt={editTarget} onClose={closeModal} onSave={handleSave} isSaving={create.isPending || update.isPending} />
      <ConfirmModal open={Boolean(deleteTarget)} title="Delete prompt?" description={`"${deleteTarget?.title}" will be permanently removed.`} confirmLabel="Delete" isDestructive
        onCancel={() => setDeleteTarget(undefined)} onConfirm={() => { if (deleteTarget) remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(undefined) }); }} />
    </div>
  );
}
