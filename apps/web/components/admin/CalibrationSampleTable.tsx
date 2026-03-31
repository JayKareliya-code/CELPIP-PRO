// ─────────────────────────────────────────────────────────────────────────────
// CalibrationSampleTable.tsx — Admin table for calibration samples
//
// Columns: Skill | Task # | Band Level | Sample Text (truncated) | Date | Actions
// Actions: Edit (opens CalibrationSampleForm) | Delete (ConfirmModal)
//
// Phase 1: client-side with mock data. Phase 2: React Query fetch.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState }                from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScoreBadge }              from "@/components/common/ScoreBadge";
import { SkillBadge }              from "@/components/common/SkillBadge";
import { ConfirmModal }            from "@/components/common/ConfirmModal";
import { EmptyState }              from "@/components/common/EmptyState";
import { CalibrationSampleForm }   from "@/components/admin/CalibrationSampleForm";
import { timeAgo }                 from "@/lib/utils";
import type { CalibrationSample }  from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CalibrationSampleTableProps {
  samples: CalibrationSample[];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Admin data table for calibration samples.
 * All mutations are client-side only (mock) in Phase 1.
 */
export function CalibrationSampleTable({ samples: initial }: CalibrationSampleTableProps) {
  const [rows,         setRows]         = useState<CalibrationSample[]>(initial);
  const [editTarget,   setEditTarget]   = useState<CalibrationSample | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<CalibrationSample | undefined>(undefined);
  const [showForm,     setShowForm]     = useState(false);

  // ── Handlers (mock mutations) ──────────────────────────────────────────────

  function handleSave(sample: CalibrationSample) {
    setRows((prev) =>
      editTarget
        ? prev.map((r) => (r.id === editTarget.id ? sample : r))
        : [...prev, sample]
    );
    setEditTarget(undefined);
    setShowForm(false);
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
          title="No calibration samples yet"
          description="Add reference samples to calibrate the AI scoring model."
        />
        <div className="flex justify-center mt-4">
          <AddButton onClick={() => setShowForm(true)} />
        </div>
        <CalibrationSampleForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        <AddButton onClick={() => { setEditTarget(undefined); setShowForm(true); }} />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden shadow-card bg-surface">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="w-24">Skill</TableHead>
              <TableHead className="w-16 text-center">Task</TableHead>
              <TableHead className="w-20 text-center">Band</TableHead>
              <TableHead className="hidden md:table-cell">Sample Text</TableHead>
              <TableHead className="w-28 hidden sm:table-cell">Added</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((sample) => (
              <TableRow key={sample.id} className="group hover:bg-muted/50">
                {/* Skill */}
                <TableCell>
                  <SkillBadge skill={sample.skill} />
                </TableCell>

                {/* Task number */}
                <TableCell className="text-center text-sm font-medium text-foreground">
                  {sample.task_number}
                </TableCell>

                {/* Band level */}
                <TableCell className="text-center">
                  <ScoreBadge band={sample.band_level} size="sm" />
                </TableCell>

                {/* Sample text (truncated) */}
                <TableCell className="hidden md:table-cell text-xs text-subtle max-w-xs truncate">
                  {sample.sample_text}
                </TableCell>

                {/* Date */}
                <TableCell className="hidden sm:table-cell text-xs text-subtle">
                  {timeAgo(sample.created_at)}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => { setEditTarget(sample); setShowForm(true); }}
                      aria-label="Edit calibration sample"
                      className="p-1.5 rounded-md hover:bg-primary/10 text-subtle
                                 hover:text-primary transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(sample)}
                      aria-label="Delete calibration sample"
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

      {/* Add / Edit form modal */}
      <CalibrationSampleForm
        open={showForm}
        initialSample={editTarget}
        onClose={() => { setShowForm(false); setEditTarget(undefined); }}
        onSave={handleSave}
      />

      {/* Delete confirm modal */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete calibration sample?"
        description="This sample will be permanently removed from the calibration set."
        confirmLabel="Delete"
        isDestructive
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  );
}

// ── Add button ────────────────────────────────────────────────────────────────

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      id="add-calibration-sample-btn"
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover
                 text-white text-sm font-semibold transition-colors shadow-sm"
    >
      <Plus className="w-4 h-4" />
      Add Sample
    </button>
  );
}
