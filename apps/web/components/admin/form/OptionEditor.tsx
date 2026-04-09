// ─────────────────────────────────────────────────────────────────────────────
// components/admin/form/OptionEditor.tsx
//
// Rich key-value editor for a single Task 5 option card.
// Replaces the raw JSON textarea with:
//   • Option name input
//   • Optional image upload (S3)
//   • Dynamic label/value detail rows (add/remove/edit)
//
// Outputs a single hidden <input> whose value is the JSON representation of
// the ChoiceOption — this is picked up by FormData on form submit, exactly
// the same shape the existing toPayload() parser expects.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useCallback, useId, useRef, useState } from "react";
import { ImageIcon, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { useAuth }       from "@clerk/nextjs";
import { Field }         from "@/components/admin/shared/Field";
import { inputCls }      from "@/components/admin/shared/inputCls";
import { cn }            from "@/lib/utils";
import { API_V1, authHeaders } from "@/lib/api";
import type { ChoiceOption, ChoiceOptionDetail } from "@/lib/types";

const API_BASE    = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const ACCEPT      = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES   = 5 * 1024 * 1024;

function stripPresign(url: string): string {
  try { return new URL(url).origin + new URL(url).pathname; }
  catch { return url; }
}

// ── Internal State Types ──────────────────────────────────────────────────────

interface DetailRow extends ChoiceOptionDetail {
  /** React key so rows keep identity during edits */
  _id: string;
}

type UploadState = "idle" | "signing" | "uploading" | "done" | "error";

// ── Props ──────────────────────────────────────────────────────────────────

export interface OptionEditorProps {
  /** HTML form field name — e.g. "choice_option_a" */
  fieldName:    string;
  /** Human label shown in the header — e.g. "Option A" */
  label:        string;
  /** Initial ChoiceOption data (edit mode) */
  initial?:     ChoiceOption | null;
  /**
   * S3 slot identifier for the option image endpoint.
   * "option-a" | "option-b" | "curveball"
   */
  slot:         "option-a" | "option-b" | "curveball";
}

// ── OptionEditor ──────────────────────────────────────────────────────────────

export function OptionEditor({ fieldName, label, initial, slot }: OptionEditorProps) {
  const uid        = useId();
  const { getToken } = useAuth();
  const fileRef    = useRef<HTMLInputElement>(null);

  // Core state
  const [name,    setName]    = useState(initial?.name    ?? "");
  const [rows,    setRows]    = useState<DetailRow[]>(() =>
    (initial?.details ?? []).map((d, i) => ({ ...d, _id: `r-${i}` }))
  );

  // Image state — same dual-URL pattern as SpeakingFormFields
  const [publicUrl,   setPublicUrl]  = useState(
    initial?.image_url ? stripPresign(initial.image_url) : ""
  );
  const [previewUrl,  setPreviewUrl] = useState(initial?.image_url ?? "");
  const [uploadState, setUpload]     = useState<UploadState>("idle");
  const [progress,    setProgress]   = useState(0);
  const [uploadError, setUploadErr]  = useState("");

  // ── Computed hidden JSON value ──────────────────────────────────────────────
  const json = JSON.stringify({
    name,
    ...(publicUrl ? { image_url: publicUrl } : {}),
    details: rows.map(({ label: l, value: v }) => ({ label: l, value: v })),
  });

  // ── Row helpers ────────────────────────────────────────────────────────────

  const addRow = useCallback(() => {
    setRows(r => [...r, { _id: `r-${Date.now()}`, label: "", value: "" }]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows(r => r.filter(row => row._id !== id));
  }, []);

  const updateRow = useCallback((id: string, field: "label" | "value", val: string) => {
    setRows(r => r.map(row => row._id === id ? { ...row, [field]: val } : row));
  }, []);

  // ── Image upload ───────────────────────────────────────────────────────────

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setUploadErr(`File too large — max 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
      setUpload("error");
      return;
    }
    setUploadErr("");
    setUpload("signing");
    setProgress(0);

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}${API_V1}/admin/speaking-prompts/task5-option-image-upload-url`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body:    JSON.stringify({ slot, filename: file.name, mime_type: file.type }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? `Server ${res.status}`);
      }
      const data = await res.json() as {
        upload_url: string; public_url: string; preview_url: string; s3_key: string;
      };

      setUpload("uploading");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", data.upload_url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = ev => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload  = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(file);
      });

      setPublicUrl(data.public_url);
      setPreviewUrl(data.preview_url);
      setUpload("done");
      setProgress(100);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
      setUpload("error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function clearImage() {
    setPublicUrl("");
    setPreviewUrl("");
    setUpload("idle");
    setProgress(0);
    setUploadErr("");
  }

  const isBusy   = uploadState === "signing" || uploadState === "uploading";
  const hasImage = Boolean(previewUrl || publicUrl);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">{label}</span>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Option name ─────────────────────────────────────────────────── */}
        <Field label="Option Name" htmlFor={`${uid}-name`} required>
          <input
            id={`${uid}-name`}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className={inputCls}
            placeholder="e.g. Hairdressing"
          />
        </Field>

        {/* ── Image upload ────────────────────────────────────────────────── */}
        <Field label="Card Image (optional)" htmlFor={`${uid}-img`}>
          <div className="space-y-2">
            {/* Drop zone */}
            <div
              onClick={() => !isBusy && fileRef.current?.click()}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed",
                "h-20 cursor-pointer transition-colors text-xs",
                isBusy
                  ? "border-primary/40 bg-primary/5 cursor-not-allowed"
                  : "border-border hover:border-primary/50 hover:bg-white/5",
              )}
            >
              <input
                ref={fileRef}
                id={`${uid}-img`}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={handleFile}
                disabled={isBusy}
              />
              {isBusy ? (
                <>
                  <div className="w-28 h-1.5 rounded-full bg-border overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-subtle/60">
                    {uploadState === "signing" ? "Getting upload URL…" : `Uploading ${progress}%`}
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-subtle/40" />
                  <span className="text-subtle/50">
                    {hasImage ? "Click to replace" : "Upload card image"}
                    <span className="ml-1 text-subtle/30">· JPG, PNG, WebP · max 5 MB</span>
                  </span>
                </>
              )}
            </div>

            {/* Error */}
            {uploadState === "error" && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <X className="w-3 h-3" /> {uploadError}
              </p>
            )}

            {/* Preview */}
            {previewUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-border bg-muted h-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Option preview" className="w-full h-full object-cover" />
                <div className="absolute top-1.5 right-1.5 flex gap-1">
                  <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                    {uploadState === "done" ? "Uploaded ✓" : "Saved"}
                  </span>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="bg-red-600/80 hover:bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border h-12 text-subtle/40 text-xs">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{publicUrl ? "Loading preview…" : "No image"}</span>
              </div>
            )}
          </div>
        </Field>

        {/* ── Detail rows ─────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground/60">Comparison Details</p>

          {rows.length > 0 && (
            <div className="space-y-1.5">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_1fr_28px] gap-2 px-1">
                <span className="text-[10px] font-semibold text-subtle/50 uppercase tracking-wider">Label</span>
                <span className="text-[10px] font-semibold text-subtle/50 uppercase tracking-wider">Value</span>
              </div>

              {rows.map(row => (
                <div key={row._id} className="grid grid-cols-[1fr_1fr_28px] gap-2 items-center">
                  <input
                    type="text"
                    value={row.label}
                    onChange={e => updateRow(row._id, "label", e.target.value)}
                    placeholder="e.g. Tuition cost"
                    className={cn(inputCls, "text-sm py-1.5")}
                  />
                  <input
                    type="text"
                    value={row.value}
                    onChange={e => updateRow(row._id, "value", e.target.value)}
                    placeholder="e.g. $20,000"
                    className={cn(inputCls, "text-sm py-1.5")}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(row._id)}
                    className="flex items-center justify-center w-7 h-7 rounded-md text-subtle/40 hover:text-danger hover:bg-danger/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {rows.length === 0 && (
            <p className="text-xs text-subtle/40 italic py-1">No details yet — add rows below.</p>
          )}

          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors mt-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add row
          </button>
        </div>

        {/* ── Hidden serialised JSON output (picked up by FormData) ────────── */}
        <input type="hidden" name={fieldName} value={json} />
      </div>
    </div>
  );
}
