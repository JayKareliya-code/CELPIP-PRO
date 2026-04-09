"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/admin/speaking/SpeakingPromptsTable.tsx
// Table of prompts for a single speaking task. Purely presentational —
// all data and mutation handlers come from the parent orchestrator.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { Pencil, Trash2, CheckCircle, XCircle, Upload, Archive, ImageIcon } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge }  from "@/components/ui/badge";
import { cn }     from "@/lib/utils";
import { DIFFICULTY_STYLES, STATUS_STYLES } from "@/lib/admin/promptBadges";
import type { SpeakingPrompt } from "@/lib/types";

/** Task numbers that require a context scene image. */
const IMAGE_TASKS = new Set([3, 4, 8]);

/**
 * A small image thumbnail for the table row.
 * The list API returns a 1-hour presigned GET URL in context_image_url.
 * If the URL has expired (403) or fails to load for any reason, we degrade
 * gracefully to the placeholder icon instead of showing a broken image.
 */
function ImageThumb({ url }: { url: string | null }) {
  const [failed, setFailed] = React.useState(false);

  // Reset the error state when the URL changes (different prompt row)
  React.useEffect(() => { setFailed(false); }, [url]);

  if (url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Scene"
        crossOrigin="anonymous"
        onError={() => setFailed(true)}
        className="shrink-0 w-10 h-7 rounded object-cover border border-border"
      />
    );
  }

  return (
    <div
      title={url ? "Image preview unavailable — may have expired" : "No scene image set"}
      className="shrink-0 w-10 h-7 rounded border border-dashed border-border bg-muted flex items-center justify-center"
    >
      <ImageIcon className="w-3 h-3 text-subtle/40" />
    </div>
  );
}

interface Props {
  prompts:        SpeakingPrompt[];
  isMutating:     boolean;
  onEdit:         (p: SpeakingPrompt) => void;
  onDelete:       (p: SpeakingPrompt) => void;
  onToggleActive: (p: SpeakingPrompt) => void;
  onPublish:      (id: string) => void;
  onArchive:      (id: string) => void;
}

export function SpeakingPromptsTable({
  prompts, isMutating, onEdit, onDelete, onToggleActive, onPublish, onArchive,
}: Props) {
  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-card bg-surface">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className="w-full">Prompt</TableHead>
            <TableHead className="w-24 text-center hidden sm:table-cell">Prep</TableHead>
            <TableHead className="w-28 text-center hidden sm:table-cell">Response</TableHead>
            <TableHead className="w-24 hidden md:table-cell">Difficulty</TableHead>
            <TableHead className="w-28 hidden lg:table-cell">Status</TableHead>
            <TableHead className="w-20 text-center">Active</TableHead>
            <TableHead className="w-36 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {prompts.map((p) => (
            <TableRow key={p.id} className="group hover:bg-muted/50 align-top">
              <TableCell className="py-3">
                <div className="flex items-start gap-2.5">
                  {/* Image thumbnail / placeholder for Tasks 3, 4, 8 */}
                  {IMAGE_TASKS.has(p.task_number) && (
                    <ImageThumb url={p.context_image_url ?? null} />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{p.prompt_text}</p>
                    {p.topic && <Badge variant="outline" className="mt-1 text-[10px]">{p.topic}</Badge>}
                  </div>
                </div>
              </TableCell>

              <TableCell className="text-center text-xs text-subtle hidden sm:table-cell">
                {p.prep_time_seconds}s
              </TableCell>
              <TableCell className="text-center text-xs text-subtle hidden sm:table-cell">
                {p.response_time_seconds}s
              </TableCell>

              <TableCell className="hidden md:table-cell">
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                  DIFFICULTY_STYLES[p.difficulty] ?? "bg-muted text-subtle",
                )}>{p.difficulty}</span>
              </TableCell>

              <TableCell className="hidden lg:table-cell">
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                  STATUS_STYLES[p.status ?? "draft"] ?? "bg-muted text-subtle",
                )}>{p.status ?? "draft"}</span>
              </TableCell>

              <TableCell className="text-center">
                <button onClick={() => onToggleActive(p)} disabled={isMutating}
                  aria-label={p.is_active ? "Deactivate" : "Activate"}>
                  {p.is_active
                    ? <CheckCircle className="w-4 h-4 text-success mx-auto" />
                    : <XCircle    className="w-4 h-4 text-subtle  mx-auto" />}
                </button>
              </TableCell>

              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {(!p.status || p.status === "draft" || p.status === "archived") && (
                    <button onClick={() => onPublish(p.id)} title="Publish" disabled={isMutating}
                      className="p-1.5 rounded-md hover:bg-success/10 text-subtle hover:text-success transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {p.status === "published" && (
                    <button onClick={() => onArchive(p.id)} title="Archive" disabled={isMutating}
                      className="p-1.5 rounded-md hover:bg-warning/10 text-subtle hover:text-warning transition-colors">
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => onEdit(p)} title="Edit" disabled={isMutating}
                    className="p-1.5 rounded-md hover:bg-primary/10 text-subtle hover:text-primary transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete(p)} title="Delete" disabled={isMutating}
                    className="p-1.5 rounded-md hover:bg-danger/10 text-subtle hover:text-danger transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
