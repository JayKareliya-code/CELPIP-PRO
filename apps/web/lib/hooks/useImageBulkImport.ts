// ─────────────────────────────────────────────────────────────────────────────
// lib/hooks/useImageBulkImport.ts
//
// Bulk image → prompt importer for image-based speaking tasks (3 and 4).
//
// Flow: for each image file (a whole folder can be selected), request a presigned
// S3 PUT URL, upload the file directly to S3, then create one prompt per image via
// the existing /admin/speaking-prompts/bulk-import endpoint. Every prompt for a
// task shares the same fixed prompt text; only the attached image differs.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useRef, useState, useCallback } from "react";
import { useAuth }                       from "@clerk/nextjs";
import { useQueryClient }                from "@tanstack/react-query";
import { api, API_V1, authHeaders }      from "@/lib/api";
import { API_BASE, MAX_UPLOAD_BYTES, uploadFileToS3 } from "@/lib/admin/imageUpload";
import { BASE_KEYS }                     from "@/lib/hooks/useAdminPrompts";
import type { BulkImportResult, BulkStatus, BulkConflict } from "@/lib/hooks/useBulkImportPrompts";

export type ImageTask = 3 | 4;

/** Each image-based task uses ONE fixed prompt; only the picture changes. */
export const FIXED_PROMPT: Record<ImageTask, string> = {
  3: "Describe the scene.",
  4: "Predict what will happen next.",
};
const FIXED_CONNECTORS: Record<ImageTask, string[]> = {
  3: ["In the foreground", "In the background", "On the left", "To the right", "In the middle", "It looks like"],
  4: ["In the picture", "It looks like", "I think", "Most likely", "As a result", "In the end"],
};
const FIXED_TEMPLATE: Record<ImageTask, string> = {
  3: "Give a one-line overview, then describe the foreground and background using spatial language, and finish by speculating about the mood or purpose.",
  4: "Briefly describe what you see now, predict what is likely to happen next, and explain your reasoning using details from the picture.",
};
const TASK_LABEL: Record<ImageTask, string> = { 3: "Scene", 4: "Prediction" };

const CONCURRENCY = 4;            // simultaneous uploads
const IMPORT_TIMEOUT_MS = 180_000;

const slugify = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const baseName = (name: string) => name.replace(/\.[^.]+$/, "");
const prettyTitle = (name: string) =>
  baseName(name).replace(/[_-]+/g, " ").trim().replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export interface ImageImportOptions {
  /** Each image is shared across these tasks — one prompt is created per task. */
  tasks:         ImageTask[];
  files:         File[];
  difficulty:    "easy" | "medium" | "hard";
  defaultStatus: BulkStatus;
  onConflict:    BulkConflict;
  promptTag:     "practice" | "mock";
}

/** Server cap per bulk-import request — MUST match MAX_BULK_ITEMS in
 *  apps/api/app/api/v1/_bulk_schemas.py. Checked client-side BEFORE uploading so a
 *  too-large folder fails fast instead of uploading hundreds of images to S3 and
 *  then being rejected with a 422 (which would orphan every uploaded object). */
export const MAX_IMPORT_ITEMS = 1000;

export interface UploadFailure { filename: string; error: string }

export type ImagePhase = "idle" | "uploading" | "importing" | "done" | "error";

export function useImageBulkImport() {
  const { getToken } = useAuth();
  const qc           = useQueryClient();

  const [phase,   setPhase]   = useState<ImagePhase>("idle");
  const [total,   setTotal]   = useState(0);
  const [done,    setDone]    = useState(0);
  const [failures, setFailures] = useState<UploadFailure[]>([]);
  const [result,  setResult]  = useState<BulkImportResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setPhase("idle"); setTotal(0); setDone(0);
    setFailures([]); setResult(null); setError(null);
  }, []);

  const cancel = useCallback(() => { abortRef.current?.abort(); }, []);

  const run = useCallback(async (opts: ImageImportOptions) => {
    setPhase("uploading"); setResult(null); setError(null); setFailures([]); setDone(0);

    if (opts.tasks.length === 0) { setPhase("error"); setError("Select at least one task (3 or 4)."); return; }

    const valid = opts.files.filter((f) => f.type.startsWith("image/") && f.size <= MAX_UPLOAD_BYTES);
    setTotal(valid.length);
    if (valid.length === 0) { setPhase("error"); setError("No valid image files selected (must be images under 5 MB)."); return; }

    // Reject too-large batches BEFORE any upload, so we never PUT hundreds of
    // images to S3 only to have the import POST rejected (and orphan them).
    const projected = valid.length * opts.tasks.length;
    if (projected > MAX_IMPORT_ITEMS) {
      setPhase("error");
      setError(
        `That would create ${projected} prompts (${valid.length} images × ${opts.tasks.length} tasks), ` +
        `over the ${MAX_IMPORT_ITEMS}-per-run limit. Select fewer images, fewer tasks, or split into batches.`,
      );
      return;
    }

    // Each image is uploaded ONCE and reused by every selected task.
    const uploadTask = opts.tasks[0];

    const controller = new AbortController();
    abortRef.current = controller;

    const uploaded: { filename: string; key: string }[] = [];
    const failed:   UploadFailure[] = [];
    let cursor = 0;

    const worker = async () => {
      while (cursor < valid.length && !controller.signal.aborted) {
        const file = valid[cursor++];
        try {
          const token = await getToken();
          if (!token) throw new Error("Not authenticated");
          const res = await fetch(`${API_BASE}${API_V1}/admin/speaking-prompts/image-upload-url`, {
            method:  "POST",
            headers: { "Content-Type": "application/json", ...authHeaders(token) },
            body:    JSON.stringify({ task_number: uploadTask, filename: file.name, mime_type: file.type }),
            signal:  controller.signal,
          });
          if (!res.ok) throw new Error(`presign failed (${res.status})`);
          const data = await res.json() as { upload_url: string; public_url: string };
          await uploadFileToS3(data.upload_url, file, file.type, () => {}, controller.signal);
          uploaded.push({ filename: file.name, key: data.public_url });
        } catch (e) {
          if (controller.signal.aborted) return;
          failed.push({ filename: file.name, error: e instanceof Error ? e.message : "upload failed" });
        }
        setDone(uploaded.length + failed.length);
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, valid.length) }, worker));
    if (controller.signal.aborted) { setPhase("error"); setError("Cancelled."); return; }
    setFailures(failed);

    if (uploaded.length === 0) { setPhase("error"); setError("All image uploads failed."); return; }

    // Build prompts: each uploaded image yields one prompt per selected task,
    // all sharing the same picture. Slugs are unique within the batch (the task
    // label keeps Task 3 and Task 4 slugs distinct, e.g. scene-1 / prediction-1).
    const seen = new Set<string>();
    const items = uploaded.flatMap((u, i) =>
      opts.tasks.map((tk) => {
        // Prefix with the task label so numeric filenames (1.png) still read as
        // "Scene 1" / "Prediction 1" rather than a bare number.
        const base  = prettyTitle(u.filename) || String(i + 1);
        const title = `${TASK_LABEL[tk]} ${base}`;
        const slugBase = slugify(title) || `${slugify(TASK_LABEL[tk])}-${i + 1}`;
        let slug = slugBase, n = 2;
        while (seen.has(slug)) { slug = `${slugBase}-${n++}`; }
        seen.add(slug);
        return {
          task_number:           tk,
          title,
          slug,
          prompt_text:           FIXED_PROMPT[tk],
          context_image_url:     u.key,
          difficulty:            opts.difficulty,
          prep_time_seconds:     30,
          response_time_seconds: 60,
          connector_phrases:     FIXED_CONNECTORS[tk],
          template_hint:         FIXED_TEMPLATE[tk],
          prompt_tag:            opts.promptTag,
        };
      }),
    );

    setPhase("importing");
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await api.post<BulkImportResult>(
        `${API_V1}/admin/speaking-prompts/bulk-import`,
        { mode: "commit", on_conflict: opts.onConflict, default_status: opts.defaultStatus, check_images: true, items },
        { headers: authHeaders(token), signal: AbortSignal.timeout(IMPORT_TIMEOUT_MS) },
      );
      setResult(res);
      setPhase("done");
      if (res.ok && res.created > 0) {
        qc.invalidateQueries({ queryKey: BASE_KEYS.adminSpeaking });
        qc.invalidateQueries({ queryKey: BASE_KEYS.publicSpeaking });
      }
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Import failed.");
    }
  }, [getToken, qc]);

  return { run, cancel, reset, phase, total, done, failures, result, error };
}
