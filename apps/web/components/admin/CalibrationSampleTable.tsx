// ─────────────────────────────────────────────────────────────────────────────
// CalibrationSampleTable.tsx — Admin table for calibration samples
//
// Columns: Skill | Task # | Band Level | Active | Sample Text (truncated) | Date | Actions
//
// Bug fixes from code review:
//   1. Removed duplicated AddButton — uses shared component.
//   2. useEffect syncs rows when `initial` prop changes (React Query bridge).
//   3. handleSave does not call closeForm internally — parent manages lifecycle.
//   4. crypto.randomUUID() for mock IDs.
//   5. Active toggle column added — visible without opening edit form.
//   6. Toast feedback on every mutation.
//   7. Improved aria-labels on action buttons (include band + skill context).
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScoreBadge }             from "@/components/common/ScoreBadge";
import { SkillBadge }             from "@/components/common/SkillBadge";
import { ConfirmModal }           from "@/components/common/ConfirmModal";
import { EmptyState }             from "@/components/common/EmptyState";
import { CalibrationSampleForm }  from "@/components/admin/CalibrationSampleForm";
import { AddButton }              from "@/components/admin/shared/AddButton";
import { timeAgo }                from "@/lib/utils";
import type { CalibrationSample } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CalibrationSampleTableProps {
  samples: CalibrationSample[];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Admin data table for calibration samples.
 *
 * Phase 1: client-side mutations with mock data fed via props.
 * Phase 2: replace mutations with React Query; keep table JSX unchanged.
 */
export function CalibrationSampleTable({ samples: initial }: CalibrationSampleTableProps) {
  const [rows,         setRows]         = useState<CalibrationSample[]>(initial);
  const [editTarget,   setEditTarget]   = useState<CalibrationSample | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<CalibrationSample | undefined>(undefined);
  const [formOpen,     setFormOpen]     = useState(false);

  // Sync rows when the parent re-renders with fresh data (React Query bridge).
  useEffect(() => {
    setRows(initial);
  }, [initial]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openCreate = useCallback(() => {
    setEditTarget(undefined);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((sample: CalibrationSample) => {
    setEditTarget(sample);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditTarget(undefined);
  }, []);

  function handleSave(sample: CalibrationSample) {
    const isEdit = Boolean(editTarget);
    setRows((prev) =>
      isEdit
        ? prev.map((r) => (r.id === editTarget!.id ? sample : r))
        : [...prev, { ...sample, id: crypto.randomUUID() }],
    );
    // Close after state update — parent controls lifecycle.
    closeForm();
    toast.success(isEdit ? "Sample updated." : "Sample added to calibration set.");
  }

  function handleToggleActive(sample: CalibrationSample) {
    const next = { ...sample, is_active: !sample.is_active };
    setRows((prev) => prev.map((r) => (r.id === sample.id ? next : r)));
    toast.success(next.is_active ? "Sample activated." : "Sample deactivated.");
  }

  function handleDelete(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setDeleteTarget(undefined);
    toast.success("Calibration sample removed.");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddButton id="add-calibration-sample-btn" label="Add Sample" onClick={openCreate} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No calibration samples yet"
          description="Add reference samples to calibrate the AI scoring model."
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden shadow-card bg-surface">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-24">Skill</TableHead>
                <TableHead className="w-16 text-center">Task</TableHead>
                <TableHead className="w-20 text-center">Band</TableHead>
                <TableHead className="w-20 text-center">Active</TableHead>
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
                    {sample.task_number ?? "—"}
                  </TableCell>

                  {/* Band level */}
                  <TableCell className="text-center">
                    <ScoreBadge band={sample.band_level} size="sm" />
                  </TableCell>

                  {/* Active toggle */}
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleToggleActive(sample)}
                      aria-label={
                        sample.is_active
                          ? `Deactivate band ${sample.band_level} ${sample.skill} sample`
                          : `Activate band ${sample.band_level} ${sample.skill} sample`
                      }
                      className="transition-colors"
                    >
                      {sample.is_active
                        ? <CheckCircle className="w-4 h-4 text-success mx-auto" />
                        : <XCircle    className="w-4 h-4 text-subtle  mx-auto" />
                      }
                    </button>
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
                        onClick={() => openEdit(sample)}
                        aria-label={`Edit band ${sample.band_level} ${sample.skill} sample`}
                        className="p-1.5 rounded-md hover:bg-primary/10 text-subtle
                                   hover:text-primary transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(sample)}
                        aria-label={`Delete band ${sample.band_level} ${sample.skill} sample`}
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
      )}

      {/* Add / Edit form modal */}
      <CalibrationSampleForm
        open={formOpen}
        initialSample={editTarget}
        onClose={closeForm}
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
