// ─────────────────────────────────────────────────────────────────────────────
// SpeakingPromptTable.tsx — Admin table for all speaking prompts
//
// Columns: Task # | Title | Prep | Response | Difficulty | Active | Actions
// Actions: Edit (opens PromptFormModal) | Toggle active | Delete (ConfirmModal)
//
// Phase 1: fully client-side with mock data fed via props.
// Phase 2: swap props for a React Query paginated fetch.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState }          from "react";
import { Pencil, Trash2, CheckCircle, XCircle, Plus } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge }             from "@/components/ui/badge";
import { PromptFormModal }   from "@/components/admin/PromptFormModal";
import { ConfirmModal }      from "@/components/common/ConfirmModal";
import { EmptyState }        from "@/components/common/EmptyState";
import { cn }                from "@/lib/utils";
import type { SpeakingPrompt } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface SpeakingPromptTableProps {
  prompts: SpeakingPrompt[];
}

// ── Difficulty badge colour ───────────────────────────────────────────────────

const DIFFICULTY_STYLES: Record<string, string> = {
  easy:   "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  hard:   "bg-danger/10  text-danger  border-danger/20",
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Data table of speaking prompts for the admin prompt management page.
 * All mutations are client-side only (mock) in Phase 1.
 */
export function SpeakingPromptTable({ prompts: initial }: SpeakingPromptTableProps) {
  const [rows,         setRows]         = useState<SpeakingPrompt[]>(initial);
  const [editTarget,   setEditTarget]   = useState<SpeakingPrompt | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<SpeakingPrompt | undefined>(undefined);
  const [showAdd,      setShowAdd]      = useState(false);

  // ── Handlers (mock mutations) ──────────────────────────────────────────────

  function handleSave(data: FormData) {
    const updated: SpeakingPrompt = {
      id:                   editTarget?.id ?? `sp-${Date.now()}`,
      task_number:          Number(data.get("task_number")),
      title:                String(data.get("title")),
      prep_time_seconds:    Number(data.get("prep_time_seconds")),
      response_time_seconds: Number(data.get("response_time_seconds")),
      prompt_text:          String(data.get("prompt_text")),
      difficulty:           String(data.get("difficulty")) as SpeakingPrompt["difficulty"],
      is_active:            data.get("is_active") === "on",
      created_at:           editTarget?.created_at ?? new Date().toISOString(),
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
          title="No speaking prompts yet"
          description="Add your first speaking prompt to get started."
        />
        <AddButton onClick={() => setShowAdd(true)} />
        <PromptFormModal
          open={showAdd}
          skill="speaking"
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
              <TableHead className="w-20 text-center hidden sm:table-cell">Prep</TableHead>
              <TableHead className="w-24 text-center hidden sm:table-cell">Response</TableHead>
              <TableHead className="w-24 hidden md:table-cell">Difficulty</TableHead>
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
                    {prompt.task_number === 0 ? "P" : prompt.task_number}
                  </Badge>
                </TableCell>

                {/* Title */}
                <TableCell className="font-medium text-sm text-foreground max-w-xs truncate">
                  {prompt.title}
                </TableCell>

                {/* Prep time */}
                <TableCell className="text-center text-xs text-subtle hidden sm:table-cell">
                  {prompt.prep_time_seconds}s
                </TableCell>

                {/* Response time */}
                <TableCell className="text-center text-xs text-subtle hidden sm:table-cell">
                  {prompt.response_time_seconds}s
                </TableCell>

                {/* Difficulty */}
                <TableCell className="hidden md:table-cell">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                      DIFFICULTY_STYLES[prompt.difficulty] ?? "bg-muted text-subtle"
                    )}
                  >
                    {prompt.difficulty}
                  </span>
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
        skill="speaking"
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
      id="add-speaking-prompt-btn"
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover
                 text-white text-sm font-semibold transition-colors shadow-sm"
    >
      <Plus className="w-4 h-4" />
      Add Prompt
    </button>
  );
}
