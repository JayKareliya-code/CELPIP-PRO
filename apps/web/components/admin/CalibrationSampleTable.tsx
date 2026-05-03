// ─────────────────────────────────────────────────────────────────────────────
// CalibrationSampleTable.tsx — Admin table for calibration samples (live API)
//
// Fully wired to the real backend:
//   • GET  /admin/calibration     — list all samples
//   • POST /admin/calibration     — create
//   • PUT  /admin/calibration/:id — full edit
//   • PATCH /admin/calibration/:id — toggle active
//   • DELETE /admin/calibration/:id — hard delete
//
// Auth via Clerk's useAuth() hook (bearer token on every call).
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth }                     from "@clerk/nextjs";
import { Pencil, Trash2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast }                       from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScoreBadge }                  from "@/components/common/ScoreBadge";
import { SkillBadge }                  from "@/components/common/SkillBadge";
import { ConfirmModal }                from "@/components/common/ConfirmModal";
import { EmptyState }                  from "@/components/common/EmptyState";
import { CalibrationSampleForm }       from "@/components/admin/CalibrationSampleForm";
import { AddButton }                   from "@/components/admin/shared/AddButton";
import { timeAgo }                     from "@/lib/utils";
import type { CalibrationSample }      from "@/lib/types";
import {
  createCalibrationSample,
  updateCalibrationSample,
  toggleCalibrationSample,
  deleteCalibrationSample,
} from "@/lib/admin/calibrationApi";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CalibrationSampleTableProps {
  /** Live samples fetched by the parent server / client component. */
  samples:    CalibrationSample[];
  /** Called after any mutation so the parent can refresh its data. */
  onRefresh?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CalibrationSampleTable({
  samples,
  onRefresh,
}: CalibrationSampleTableProps) {
  const { getToken } = useAuth();

  // ── Local optimistic state ──────────────────────────────────────────────────
  const [rows,         setRows]         = useState<CalibrationSample[]>(samples);
  const [editTarget,   setEditTarget]   = useState<CalibrationSample | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<CalibrationSample | undefined>(undefined);
  const [formOpen,     setFormOpen]     = useState(false);
  const [busyId,       setBusyId]       = useState<string | null>(null);

  // ── Sync rows when parent refreshes (but not during an active mutation) ───
  useEffect(() => {
    if (!busyId && !formOpen) {
      setRows(samples);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samples]);

  // ── Form lifecycle ──────────────────────────────────────────────────────────

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

  // ── Mutations ───────────────────────────────────────────────────────────────

  async function handleSave(sample: CalibrationSample) {
    const token = await getToken();
    if (!token) { toast.error("Not authenticated"); return; }

    const payload = {
      skill:       sample.skill,
      task_number: sample.task_number,
      band_level:  sample.band_level,
      sample_text: sample.sample_text,
      source:      sample.source,
      is_active:   sample.is_active,
    };

    try {
      if (editTarget) {
        // ── Update existing sample ──────────────────────────────────────────
        const updated = await updateCalibrationSample(editTarget.id, payload, token);
        setRows((prev) => prev.map((r) => (r.id === editTarget.id ? updated : r)));
        toast.success("Calibration sample updated.");
      } else {
        // ── Create new sample ───────────────────────────────────────────────
        const created = await createCalibrationSample(payload, token);
        setRows((prev) => [...prev, created]);
        toast.success("Sample added to calibration set.");
      }
      closeForm();
      onRefresh?.();
    } catch {
      toast.error("Failed to save sample. Please try again.");
    }
  }

  async function handleToggleActive(sample: CalibrationSample) {
    if (busyId) return;
    setBusyId(sample.id);
    // Optimistic update
    const next = { ...sample, is_active: !sample.is_active };
    setRows((prev) => prev.map((r) => (r.id === sample.id ? next : r)));
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await toggleCalibrationSample(sample.id, token);
      toast.success(next.is_active ? "Sample activated." : "Sample deactivated.");
      onRefresh?.();
    } catch {
      // Rollback on failure
      setRows((prev) => prev.map((r) => (r.id === sample.id ? sample : r)));
      toast.error("Failed to update sample status.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await deleteCalibrationSample(id, token);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setDeleteTarget(undefined);
      toast.success("Calibration sample removed.");
      onRefresh?.();
    } catch {
      toast.error("Failed to delete sample.");
    } finally {
      setBusyId(null);
    }
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
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((sample) => {
                const isBusy = busyId === sample.id;
                return (
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
                        disabled={isBusy}
                        aria-label={
                          sample.is_active
                            ? `Deactivate band ${sample.band_level} ${sample.skill} sample`
                            : `Activate band ${sample.band_level} ${sample.skill} sample`
                        }
                        className="transition-colors disabled:opacity-50"
                      >
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 text-subtle mx-auto animate-spin" />
                        ) : sample.is_active ? (
                          <CheckCircle className="w-4 h-4 text-success mx-auto" />
                        ) : (
                          <XCircle    className="w-4 h-4 text-subtle  mx-auto" />
                        )}
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
                          disabled={isBusy}
                          aria-label={`Edit band ${sample.band_level} ${sample.skill} sample`}
                          className="p-1.5 rounded-md hover:bg-primary/10 text-subtle
                                     hover:text-primary transition-colors disabled:opacity-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(sample)}
                          disabled={isBusy}
                          aria-label={`Delete band ${sample.band_level} ${sample.skill} sample`}
                          className="p-1.5 rounded-md hover:bg-danger/10 text-subtle
                                     hover:text-danger transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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
        description="This sample will be permanently removed from the calibration set and will no longer influence AI scoring."
        confirmLabel="Delete"
        isDestructive
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  );
}
