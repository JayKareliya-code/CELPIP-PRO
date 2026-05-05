"use client";

// ─────────────────────────────────────────────────────────────────────────────
// AdminWritingTaskDetail.tsx — Orchestrator for /admin/prompts/writing/[task].
// Composes: WritingTaskHeader + WritingPromptsTable + create/edit/delete modals
//           + PromptTableToolbar for search/filter.
// Mirrors AdminSpeakingTaskDetail.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from "react";
import { Loader2, Plus }  from "lucide-react";
import { toast }          from "sonner";
import { PromptFormModal } from "@/components/admin/PromptFormModal";
import { ConfirmModal }    from "@/components/common/ConfirmModal";
import { WritingTaskHeader }   from "./writing/WritingTaskHeader";
import { WritingPromptsTable } from "./writing/WritingPromptsTable";
import {
  PromptTableToolbar,
  type StatusFilter,
  type ActiveFilter,
} from "@/components/admin/shared/PromptTableToolbar";
import {
  useAdminWritingPrompts,
  useCreateWritingPrompt,
  useUpdateWritingPrompt,
  useDeleteWritingPrompt,
  usePublishWritingPrompt,
  useArchiveWritingPrompt,
  useToggleActiveWritingPrompt,
  type WritingPromptPayload,
} from "@/lib/hooks/useAdminPrompts";
import type { WritingPrompt } from "@/lib/types";

// ── Payload builder ───────────────────────────────────────────────────────────

function toPayload(data: FormData, taskNumber: number): WritingPromptPayload {
  const promptText = String(data.get("prompt_text") || "");
  // Title is hidden in locked-task mode — auto-derive from first 60 chars of prompt
  const rawTitle = String(data.get("title") || "").trim();
  const title    = rawTitle || promptText.slice(0, 60).trim() || `Task ${taskNumber} Prompt`;

  return {
    task_number:        taskNumber,
    title,
    prompt_text:        promptText,
    task_type:          String(data.get("task_type") || (taskNumber === 1 ? "email" : "opinion_essay")),
    time_limit_seconds: Number(data.get("time_limit_seconds")),
    min_words:          Number(data.get("min_words")),
    max_words:          Number(data.get("max_words")) || null,
    difficulty:         String(data.get("difficulty") || "medium") as WritingPromptPayload["difficulty"],
    is_active:          data.get("is_active") === "on",
    status:             String(data.get("status") || "draft") as WritingPromptPayload["status"],
    slug:               String(data.get("slug")  || "").trim() || null,
    topic:              String(data.get("topic") || "").trim() || null,
    sort_order:         Number(data.get("sort_order") || 0),
    sample_response_band12: String(data.get("sample_response_band12") || "").trim() || null,
    prompt_tag:         String(data.get("prompt_tag") || "practice") as "practice" | "mock",
    exam_slot: (() => {
      const raw = String(data.get("exam_slot") ?? "").trim();
      const n   = parseInt(raw, 10);
      return raw && !isNaN(n) ? n : null;
    })(),
  };
}


// ── Change detection ──────────────────────────────────────────────────────────

function promptHasChanges(payload: WritingPromptPayload, original: WritingPrompt): boolean {
  const origSample = (original as WritingPrompt & { sample_response_band12?: string | null; sample_response_text?: string | null }).sample_response_band12
    ?? (original as WritingPrompt & { sample_response_text?: string | null }).sample_response_text
    ?? null;

  return (
    payload.title               !== (original.title        ?? "")        ||
    payload.prompt_text         !== (original.prompt_text  ?? "")        ||
    payload.task_type           !== (original.task_type    ?? "email")   ||
    payload.time_limit_seconds  !==  original.time_limit_seconds         ||
    payload.min_words           !==  original.min_words                  ||
    (payload.max_words ?? null) !== (original.max_words    ?? null)      ||
    payload.difficulty          !== (original.difficulty   ?? "medium")  ||
    payload.is_active           !== (original.is_active    ?? true)      ||
    (payload.status !== undefined && payload.status !== (original.status ?? "draft")) ||
    (payload.sort_order   ?? 0)    !== (original.sort_order ?? 0)        ||
    (payload.slug         ?? null) !== (original.slug       ?? null)     ||
    (payload.topic        ?? null) !== (original.topic      ?? null)     ||
    (payload.sample_response_band12 ?? null) !== (origSample ?? null)   ||
    (payload.prompt_tag   ?? "practice") !== ((original as WritingPrompt & { prompt_tag?: string }).prompt_tag ?? "practice") ||
    (payload.exam_slot    ?? null)        !== ((original as WritingPrompt & { exam_slot?: number | null }).exam_slot  ?? null)
  );
}


// ── Component ─────────────────────────────────────────────────────────────────

interface Props { taskNumber: 1 | 2 }

export function AdminWritingTaskDetail({ taskNumber }: Props) {
  const [editTarget,   setEditTarget]   = useState<WritingPrompt | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<WritingPrompt | undefined>(undefined);
  const [modalOpen,    setModalOpen]    = useState(false);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setActiveFilter("all");
  }

  const { data: allPrompts = [], isLoading, isError } = useAdminWritingPrompts();

  // ── Prompts for this task only ───────────────────────────────────────────────
  const prompts = useMemo(
    () => allPrompts.filter((p) => p.task_number === taskNumber),
    [allPrompts, taskNumber],
  );

  // ── Filtered subset (client-side) ────────────────────────────────────────────
  const filteredPrompts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return prompts.filter((p) => {
      if (q && !p.title?.toLowerCase().includes(q) && !p.prompt_text?.toLowerCase().includes(q)) {
        return false;
      }
      if (statusFilter !== "all" && (p.status ?? "draft") !== statusFilter) return false;
      if (activeFilter === "active"   && !p.is_active) return false;
      if (activeFilter === "inactive" &&  p.is_active) return false;
      return true;
    });
  }, [prompts, search, statusFilter, activeFilter]);

  const create       = useCreateWritingPrompt();
  const update       = useUpdateWritingPrompt();
  const remove       = useDeleteWritingPrompt();
  const publish      = usePublishWritingPrompt();
  const archive      = useArchiveWritingPrompt();
  const toggleActive = useToggleActiveWritingPrompt();

  const isMutating =
    create.isPending || update.isPending || remove.isPending ||
    publish.isPending || archive.isPending || toggleActive.isPending;

  const openCreate = useCallback(() => { setEditTarget(undefined); setModalOpen(true); }, []);
  const openEdit   = useCallback((p: WritingPrompt) => { setEditTarget(p); setModalOpen(true); }, []);
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

  if (isLoading) return (
    <div className="flex items-center justify-center h-40 gap-2 text-subtle text-sm">
      <Loader2 className="w-4 h-4 animate-spin" />Loading...
    </div>
  );
  if (isError) return (
    <div className="text-danger text-sm text-center py-10">Failed to load writing prompts.</div>
  );

  return (
    <div className="space-y-6">
      <WritingTaskHeader
        taskNumber={taskNumber}
        isMutating={isMutating}
        onAdd={openCreate}
      />

      {/* Filter toolbar */}
      <PromptTableToolbar
        search={search}       onSearch={setSearch}
        status={statusFilter} onStatus={setStatusFilter}
        active={activeFilter} onActive={setActiveFilter}
        total={prompts.length}
        filtered={filteredPrompts.length}
        onClear={clearFilters}
      />

      {prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 rounded-2xl border-2 border-dashed border-border">
          <p className="text-subtle text-sm">No prompts for Writing Task {taskNumber} yet.</p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Add First Prompt
          </button>
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 rounded-2xl border-2 border-dashed border-border">
          <p className="text-subtle text-sm">No prompts match your current filters.</p>
          <button
            onClick={clearFilters}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <WritingPromptsTable
          prompts={filteredPrompts}
          isMutating={isMutating}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onToggleActive={(p) => toggleActive.mutate(p.id)}
          onPublish={(id) => publish.mutate(id)}
          onArchive={(id) => archive.mutate(id)}
        />
      )}

      <PromptFormModal
        open={modalOpen}
        skill="writing"
        initialPrompt={editTarget}
        onClose={closeModal}
        onSave={handleSave}
        isSaving={create.isPending || update.isPending}
        lockedTaskNumber={taskNumber}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete writing prompt?"
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
