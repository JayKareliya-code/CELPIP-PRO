// ─────────────────────────────────────────────────────────────────────────────
// WritingPromptTable.tsx — Admin table for all writing prompts
//
// Columns: Task # | Title | Time Limit | Min Words | Max Words | Active | Actions
// Actions: Edit (opens PromptFormModal) | Toggle active | Delete (ConfirmModal)
//
// Phase 1: client-side with mock data. Phase 2: React Query paginated fetch.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState }         from "react";
import { Pencil, Trash2, CheckCircle, XCircle, Plus } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge }            from "@/components/ui/badge";
import { PromptFormModal }  from "@/components/admin/PromptFormModal";
import { ConfirmModal }     from "@/components/common/ConfirmModal";
import { EmptyState }       from "@/components/common/EmptyState";
import { formatTime }       from "@/lib/utils";
import type { WritingPrompt } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WritingPromptTableProps {
  prompts: WritingPrompt[];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Data table of writing prompts for the admin prompt management page.
 * All mutations are client-side only (mock) in Phase 1.
 */
export function WritingPromptTable({ prompts: initial }: WritingPromptTableProps) {
  const [rows,         setRows]         = useState<WritingPrompt[]>(initial);
  const [editTarget,   setEditTarget]   = useState<WritingPrompt | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<WritingPrompt | undefined>(undefined);
  const [showAdd,      setShowAdd]      = useState(false);

  // ── Handlers (mock mutations) ──────────────────────────────────────────────

  function handleSave(data: FormData) {
    const updated: WritingPrompt = {
      id:                  editTarget?.id ?? `wp-${Date.now()}`,
      task_number:         Number(data.get("task_number")) as 1 | 2,
      title:               String(data.get("title")),
      prompt_text:         String(data.get("prompt_text")),
      time_limit_seconds:  Number(data.get("time_limit_seconds")),
      min_words:           Number(data.get("min_words")),
      max_words:           Number(data.get("max_words")),
      is_active:           data.get("is_active") === "on",
      created_at:          editTarget?.created_at ?? new Date().toISOString(),
    };

    setRows((prev) =>
      editTarget
        ? prev.map((r) => (r.id === editTarget.id ? updated : r))
        : [...prev, updated]
    );
    setEditTarget(undefined);
    setShowAdd(false);
  }

  function handleToggleActive(id: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r))
    );
  }

  function handleDelete(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setDeleteTarget(undefined);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (rows.length === 0) {
    return (
      <>
        <EmptyState
          title="No writing prompts yet"
          description="Add your first writing prompt to get started."
        />
        <div className="flex justify-center mt-4">
          <AddButton onClick={() => setShowAdd(true)} />
        </div>
        <PromptFormModal
          open={showAdd}
          skill="writing"
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        <AddButton onClick={() => { setEditTarget(undefined); setShowAdd(true); }} />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden shadow-card bg-surface">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="w-16 text-center">Task</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-24 text-center hidden sm:table-cell">Time Limit</TableHead>
              <TableHead className="w-32 text-center hidden md:table-cell">Words</TableHead>
              <TableHead className="w-20 text-center">Active</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((prompt) => (
              <TableRow key={prompt.id} className="group hover:bg-muted/50">
                {/* Task number */}
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-xs font-semibold">
                    {prompt.task_number}
                  </Badge>
                </TableCell>

                {/* Title */}
                <TableCell className="font-medium text-sm text-foreground max-w-xs truncate">
                  {prompt.title}
                </TableCell>

                {/* Time limit */}
                <TableCell className="text-center text-xs text-subtle hidden sm:table-cell">
                  {formatTime(prompt.time_limit_seconds)}
                </TableCell>

                {/* Word range */}
                <TableCell className="text-center text-xs text-subtle hidden md:table-cell">
                  {prompt.min_words}–{prompt.max_words} words
                </TableCell>

                {/* Active toggle */}
                <TableCell className="text-center">
                  <button
                    onClick={() => handleToggleActive(prompt.id)}
                    aria-label={prompt.is_active ? "Deactivate prompt" : "Activate prompt"}
                    className="transition-colors"
                  >
                    {prompt.is_active
                      ? <CheckCircle className="w-4 h-4 text-success mx-auto" />
                      : <XCircle    className="w-4 h-4 text-subtle  mx-auto" />
                    }
                  </button>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => { setEditTarget(prompt); setShowAdd(true); }}
                      aria-label={`Edit ${prompt.title}`}
                      className="p-1.5 rounded-md hover:bg-primary/10 text-subtle
                                 hover:text-primary transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(prompt)}
                      aria-label={`Delete ${prompt.title}`}
                      className="p-1.5 rounded-md hover:bg-danger/10 text-subtle
                                 hover:text-danger transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit modal */}
      <PromptFormModal
        open={showAdd}
        skill="writing"
        initialPrompt={editTarget}
        onClose={() => { setShowAdd(false); setEditTarget(undefined); }}
        onSave={handleSave}
      />

      {/* Delete confirm modal */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete prompt?"
        description={`"${deleteTarget?.title}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  );
}

// ── Add button sub-component ───────────────────────────────────────────────────

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      id="add-writing-prompt-btn"
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover
                 text-white text-sm font-semibold transition-colors shadow-sm"
    >
      <Plus className="w-4 h-4" />
      Add Prompt
    </button>
  );
}
