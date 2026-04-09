"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/admin/shared/PromptTableRow.tsx
// Generic prompt table row — action buttons shared across speaking + writing.
// ─────────────────────────────────────────────────────────────────────────────

import { Pencil, Trash2, Upload, Archive, CheckCircle, XCircle } from "lucide-react";

interface ActionProps {
  status?:        string;
  isActive:       boolean;
  isMutating:     boolean;
  onEdit:         () => void;
  onDelete:       () => void;
  onToggleActive: () => void;
  onPublish:      () => void;
  onArchive:      () => void;
}

export function PromptActionButtons({
  status, isActive, isMutating, onEdit, onDelete, onToggleActive, onPublish, onArchive,
}: ActionProps) {
  return (
    <>
      {/* Active toggle */}
      <button onClick={onToggleActive} disabled={isMutating}
        aria-label={isActive ? "Deactivate" : "Activate"} className="transition-colors">
        {isActive
          ? <CheckCircle className="w-4 h-4 text-success mx-auto" />
          : <XCircle    className="w-4 h-4 text-subtle  mx-auto" />}
      </button>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-1">
        {(!status || status === "draft" || status === "archived") && (
          <button onClick={onPublish} title="Publish" disabled={isMutating}
            className="p-1.5 rounded-md hover:bg-success/10 text-subtle hover:text-success transition-colors">
            <Upload className="w-3.5 h-3.5" />
          </button>
        )}
        {status === "published" && (
          <button onClick={onArchive} title="Archive" disabled={isMutating}
            className="p-1.5 rounded-md hover:bg-warning/10 text-subtle hover:text-warning transition-colors">
            <Archive className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onEdit} title="Edit" disabled={isMutating}
          className="p-1.5 rounded-md hover:bg-primary/10 text-subtle hover:text-primary transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} title="Delete" disabled={isMutating}
          className="p-1.5 rounded-md hover:bg-danger/10 text-subtle hover:text-danger transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </>
  );
}
