// ─────────────────────────────────────────────────────────────────────────────
// lib/hooks/useBulkImportPrompts.ts
//
// React Query hook for the admin bulk prompt importer.
//
// Two phases against the same endpoint, selected by `mode`:
//   "validate" → dry run; returns a per-row report, writes nothing.
//   "commit"   → atomic write of the whole batch (all-or-nothing on the server).
//
// A bulk import inserts hundreds of rows in one request, which can exceed the
// default 20 s apiFetch timeout, so this hook passes a longer per-call timeout.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useAuth }                       from "@clerk/nextjs";
import { useMutation, useQueryClient }   from "@tanstack/react-query";
import { api, API_V1, authHeaders }      from "@/lib/api";
import { BASE_KEYS }                     from "@/lib/hooks/useAdminPrompts";

// ── Types (mirror app/api/v1/_bulk_schemas.py) ──────────────────────────────────

export type BulkSkill      = "speaking" | "writing";
export type BulkMode       = "validate" | "commit";
export type BulkConflict   = "error" | "skip" | "update";
export type BulkStatus     = "draft" | "published" | "archived";

export interface BulkRowError {
  index:  number;
  slug:   string | null;
  title:  string | null;
  errors: string[];
}

export interface BulkImportResult {
  skill:     BulkSkill;
  mode:      BulkMode;
  ok:        boolean;
  total:     number;
  valid:     number;
  to_create: number;
  to_update: number;
  to_skip:   number;
  created:   number;
  updated:   number;
  skipped:   number;
  batch_id:  string | null;
  errors:    BulkRowError[];
  warnings:  string[];
}

export interface BulkImportArgs {
  skill:          BulkSkill;
  mode:           BulkMode;
  on_conflict:    BulkConflict;
  default_status: BulkStatus;
  check_images:   boolean;
  items:          unknown[];
}

/** Long enough to absorb hundreds of row inserts; the server caps a batch at 1000. */
const BULK_TIMEOUT_MS = 120_000;

export function useBulkImportPrompts() {
  const { getToken } = useAuth();
  const qc           = useQueryClient();

  return useMutation<BulkImportResult, Error, BulkImportArgs>({
    mutationFn: async ({ skill, mode, on_conflict, default_status, check_images, items }) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const segment = skill === "speaking" ? "speaking-prompts" : "writing-prompts";
      return api.post<BulkImportResult>(
        `${API_V1}/admin/${segment}/bulk-import`,
        { mode, on_conflict, default_status, check_images, items },
        { headers: authHeaders(token), signal: AbortSignal.timeout(BULK_TIMEOUT_MS) },
      );
    },
    onSuccess: (res) => {
      // Only a real write should bust the prompt caches.
      if (res.mode !== "commit" || !res.ok) return;
      if (res.skill === "speaking") {
        qc.invalidateQueries({ queryKey: BASE_KEYS.adminSpeaking });
        qc.invalidateQueries({ queryKey: BASE_KEYS.publicSpeaking });
      } else {
        qc.invalidateQueries({ queryKey: BASE_KEYS.adminWriting });
        qc.invalidateQueries({ queryKey: BASE_KEYS.publicWriting });
      }
    },
  });
}
