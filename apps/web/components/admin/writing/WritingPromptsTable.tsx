"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/admin/writing/WritingPromptsTable.tsx
// Prompts table for a single writing task — purely presentational.
// All data and handlers come from AdminWritingTaskDetail (orchestrator).
// Mirrors speaking/SpeakingPromptsTable.tsx exactly.
// ─────────────────────────────────────────────────────────────────────────────

import { Pencil, Trash2, CheckCircle, XCircle, Upload, Archive } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn }   from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import { DIFFICULTY_STYLES, STATUS_STYLES } from "@/lib/admin/promptBadges";
import type { WritingPrompt } from "@/lib/types";

interface Props {
  prompts:        WritingPrompt[];
  isMutating:     boolean;
  onEdit:         (p: WritingPrompt) => void;
  onDelete:       (p: WritingPrompt) => void;
  onToggleActive: (p: WritingPrompt) => void;
  onPublish:      (id: string) => void;
  onArchive:      (id: string) => void;
}

export function WritingPromptsTable({
  prompts, isMutating, onEdit, onDelete, onToggleActive, onPublish, onArchive,
}: Props) {
  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-card bg-surface">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className="w-full">Prompt</TableHead>
            <TableHead className="w-24 text-center hidden sm:table-cell">Time</TableHead>
            <TableHead className="w-32 text-center hidden sm:table-cell">Words</TableHead>
            <TableHead className="w-24 hidden md:table-cell">Difficulty</TableHead>
            <TableHead className="w-28 hidden lg:table-cell">Status</TableHead>
            <TableHead className="w-20 text-center">Active</TableHead>
            <TableHead className="w-36 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {prompts.map((p) => (
            <TableRow key={p.id} className="group hover:bg-muted/50 align-top">

              {/* Prompt text + topic badge */}
              <TableCell className="py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-2">{p.prompt_text}</p>
                  {p.topic && (
                    <Badge variant="outline" className="mt-1 text-[10px]">{p.topic}</Badge>
                  )}
                </div>
              </TableCell>

              {/* Time */}
              <TableCell className="text-center text-xs text-subtle hidden sm:table-cell">
                {formatTime(p.time_limit_seconds)}
              </TableCell>

              {/* Word range */}
              <TableCell className="text-center text-xs text-subtle hidden sm:table-cell">
                {p.min_words}–{p.max_words ?? "∞"} words
              </TableCell>

              {/* Difficulty */}
              <TableCell className="hidden md:table-cell">
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                  DIFFICULTY_STYLES[p.difficulty] ?? "bg-muted text-subtle",
                )}>
                  {p.difficulty}
                </span>
              </TableCell>

              {/* Status */}
              <TableCell className="hidden lg:table-cell">
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                  STATUS_STYLES[p.status ?? "draft"] ?? "bg-muted text-subtle",
                )}>
                  {p.status ?? "draft"}
                </span>
              </TableCell>

              {/* Active toggle — mirrors SpeakingPromptsTable */}
              <TableCell className="text-center">
                <button
                  onClick={() => onToggleActive(p)}
                  disabled={isMutating}
                  aria-label={p.is_active ? "Deactivate" : "Activate"}
                >
                  {p.is_active
                    ? <CheckCircle className="w-4 h-4 text-success mx-auto" />
                    : <XCircle    className="w-4 h-4 text-subtle  mx-auto" />
                  }
                </button>
              </TableCell>

              {/* Action buttons — mirrors SpeakingPromptsTable */}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {(!p.status || p.status === "draft" || p.status === "archived") && (
                    <button
                      onClick={() => onPublish(p.id)}
                      title="Publish"
                      disabled={isMutating}
                      className="p-1.5 rounded-md hover:bg-success/10 text-subtle hover:text-success transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {p.status === "published" && (
                    <button
                      onClick={() => onArchive(p.id)}
                      title="Archive"
                      disabled={isMutating}
                      className="p-1.5 rounded-md hover:bg-warning/10 text-subtle hover:text-warning transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(p)}
                    title="Edit"
                    disabled={isMutating}
                    className="p-1.5 rounded-md hover:bg-primary/10 text-subtle hover:text-primary transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(p)}
                    title="Delete"
                    disabled={isMutating}
                    className="p-1.5 rounded-md hover:bg-danger/10 text-subtle hover:text-danger transition-colors"
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
  );
}
