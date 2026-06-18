"use client";

// ─────────────────────────────────────────────────────────────────────────────
// app/admin/image-import/page.tsx — Bulk image → prompt importer for Tasks 3 & 4.
//
// Select a folder of images; each image becomes one prompt with the task's fixed
// prompt text (Task 3 "describe the picture", Task 4 "predict what happens next").
// Images are uploaded to S3, then the prompts are created via bulk-import.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FolderOpen, Loader2, CheckCircle2, AlertTriangle, ArrowRight,
} from "lucide-react";
import { Navbar }       from "@/components/layout/Navbar";
import { Footer }       from "@/components/layout/Footer";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ROUTES }       from "@/lib/constants";
import { MAX_UPLOAD_BYTES, IMAGE_ACCEPT_TYPES } from "@/lib/admin/imageUpload";
import {
  useImageBulkImport, FIXED_PROMPT, MAX_IMPORT_ITEMS,
  type ImageTask,
} from "@/lib/hooks/useImageBulkImport";
import type { BulkStatus, BulkConflict } from "@/lib/hooks/useBulkImportPrompts";

const PREVIEW_LIMIT = 12;
const isImage = (f: File) => f.type.startsWith("image/");

function Stat({ label, value, tone = "default" }: {
  label: string; value: number; tone?: "default" | "good" | "warn" | "bad";
}) {
  const cls = { default: "text-foreground", good: "text-emerald-500", warn: "text-amber-500", bad: "text-red-500" }[tone];
  return (
    <div className="bg-muted rounded-lg border border-border px-4 py-3">
      <p className={`text-2xl font-bold tabular-nums ${cls}`}>{value}</p>
      <p className="text-xs text-subtle font-medium mt-0.5">{label}</p>
    </div>
  );
}

export default function ImageImportPage() {
  const importer = useImageBulkImport();

  const [inclT3, setInclT3]               = useState(true);
  const [inclT4, setInclT4]               = useState(true);
  const tasks = useMemo<ImageTask[]>(
    () => [...(inclT3 ? [3] : []), ...(inclT4 ? [4] : [])] as ImageTask[],
    [inclT3, inclT4],
  );
  const [difficulty, setDifficulty]       = useState<"easy" | "medium" | "hard">("medium");
  const [defaultStatus, setDefaultStatus] = useState<BulkStatus>("draft");
  const [onConflict, setOnConflict]       = useState<BulkConflict>("error");
  const [promptTag, setPromptTag]         = useState<"practice" | "mock">("practice");

  const [files, setFiles] = useState<File[]>([]);
  const folderRef = useRef<HTMLInputElement>(null);

  // Enable folder selection (non-standard attributes, set imperatively).
  useEffect(() => {
    const el = folderRef.current;
    if (el) { el.setAttribute("webkitdirectory", ""); el.setAttribute("directory", ""); }
  }, []);

  const images   = useMemo(() => files.filter(isImage), [files]);
  const skipped  = files.length - images.length;
  const oversize = useMemo(() => images.filter((f) => f.size > MAX_UPLOAD_BYTES), [images]);
  const usable   = images.length - oversize.length;

  // Thumbnails for the first N images. Create AND revoke object URLs inside one
  // effect tied to committed renders, so a discarded render (StrictMode/concurrent)
  // can never leak un-revoked blob: URLs.
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>([]);
  useEffect(() => {
    const urls = images.slice(0, PREVIEW_LIMIT).map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    setPreviews(urls);
    return () => { urls.forEach((p) => URL.revokeObjectURL(p.url)); };
  }, [images]);

  const onPick = useCallback((list: FileList | null) => {
    importer.reset();
    setFiles(list ? Array.from(list) : []);
  }, [importer]);

  const busy = importer.phase === "uploading" || importer.phase === "importing";
  const pct  = importer.total ? Math.round((importer.done / importer.total) * 100) : 0;
  const promptCount = usable * tasks.length;
  const overLimit   = promptCount > MAX_IMPORT_ITEMS;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-auto bg-muted px-6 py-8 space-y-6 max-w-4xl mx-auto w-full">

          <div>
            <h1 className="text-xl font-bold text-foreground">Image Import (Tasks 3 & 4)</h1>
            <p className="text-sm text-subtle mt-1">
              Select a folder of images. Each image is shared across the selected tasks — by default
              every picture becomes both a Task&nbsp;3 prompt (describe the scene) and a Task&nbsp;4
              prompt (predict what happens next).
            </p>
          </div>

          {/* ── Step 1: options ─────────────────────────────────────────────── */}
          <section className="bg-surface rounded-xl border border-border shadow-card p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle">1 · Options</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Tasks (per image)</span>
                <div className="flex gap-4 items-center bg-muted border border-border rounded-lg px-3 py-2">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input type="checkbox" checked={inclT3} onChange={(e) => { setInclT3(e.target.checked); importer.reset(); }}
                      className="h-4 w-4 rounded border-border accent-primary" disabled={busy} />
                    Task 3
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input type="checkbox" checked={inclT4} onChange={(e) => { setInclT4(e.target.checked); importer.reset(); }}
                      className="h-4 w-4 rounded border-border accent-primary" disabled={busy} />
                    Task 4
                  </label>
                </div>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Difficulty</span>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                  className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground" disabled={busy}>
                  <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Default status</span>
                <select value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value as BulkStatus)}
                  className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground" disabled={busy}>
                  <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Pool</span>
                <select value={promptTag} onChange={(e) => setPromptTag(e.target.value as "practice" | "mock")}
                  className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground" disabled={busy}>
                  <option value="practice">Practice</option><option value="mock">Mock exam</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">On slug conflict</span>
                <select value={onConflict} onChange={(e) => setOnConflict(e.target.value as BulkConflict)}
                  className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground" disabled={busy}>
                  <option value="error">Error</option><option value="skip">Skip</option><option value="update">Update</option>
                </select>
              </label>
            </div>
            <div className="rounded-lg bg-muted border border-border p-3 space-y-2">
              <p className="text-xs font-semibold text-subtle">Fixed prompt(s) applied to every image:</p>
              {tasks.length === 0 && <p className="text-sm text-amber-500">Select at least one task.</p>}
              {tasks.map((tk) => (
                <p key={tk} className="text-sm text-foreground">
                  <span className="font-medium">Task {tk}:</span>{" "}
                  <span className="italic">&ldquo;{FIXED_PROMPT[tk]}&rdquo;</span>
                </p>
              ))}
            </div>
          </section>

          {/* ── Step 2: choose folder ───────────────────────────────────────── */}
          <section className="bg-surface rounded-xl border border-border shadow-card p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle">2 · Image folder</h2>

            <button
              onClick={() => folderRef.current?.click()}
              disabled={busy}
              className="flex flex-col items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed
                         border-border hover:border-primary/40 px-6 py-8 cursor-pointer transition-colors disabled:opacity-50"
            >
              <FolderOpen className="w-6 h-6 text-subtle" />
              <p className="text-sm text-foreground font-medium">
                {files.length ? "Choose a different folder" : "Select an image folder"}
              </p>
              <p className="text-xs text-subtle">Images only · up to 5&nbsp;MB each · jpg, png, webp, gif</p>
            </button>
            <input
              ref={folderRef} type="file" multiple accept={IMAGE_ACCEPT_TYPES} className="hidden"
              onChange={(e) => { onPick(e.target.files); e.target.value = ""; }}
            />

            {images.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="text-emerald-500 font-medium">{usable} image{usable === 1 ? "" : "s"} ready</span>
                  {oversize.length > 0 && <span className="text-amber-500">· {oversize.length} too large (skipped)</span>}
                  {skipped > 0 && <span className="text-subtle">· {skipped} non-image (ignored)</span>}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {previews.map((p) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img key={p.name} src={p.url} alt={p.name} className="h-20 w-full object-cover rounded-lg border border-border" />
                  ))}
                  {images.length > PREVIEW_LIMIT && (
                    <div className="h-20 w-full rounded-lg border border-border bg-muted flex items-center justify-center text-xs text-subtle">
                      +{images.length - PREVIEW_LIMIT} more
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          {/* ── Step 3: run ─────────────────────────────────────────────────── */}
          <section className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void importer.run({ tasks, files, difficulty, defaultStatus, onConflict, promptTag })}
              disabled={busy || usable === 0 || tasks.length === 0 || overLimit}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white
                         hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {importer.phase === "uploading" ? `Uploading ${importer.done}/${importer.total}…`
                : importer.phase === "importing" ? "Creating prompts…"
                : promptCount > 0
                  ? `Create ${promptCount} prompt${promptCount === 1 ? "" : "s"}${tasks.length > 1 ? ` (${usable} images × ${tasks.length} tasks)` : ""}`
                  : "Create prompts"}
            </button>
            {/* Cancel only aborts uploads; the import write can't be safely interrupted. */}
            {importer.phase === "uploading" && (
              <button onClick={importer.cancel} className="text-sm text-subtle hover:text-foreground">Cancel</button>
            )}
          </section>

          {overLimit && (
            <p className="flex items-center gap-2 text-sm text-amber-500">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {promptCount} prompts exceeds the {MAX_IMPORT_ITEMS}-per-run limit. Use fewer images/tasks or split into batches.
            </p>
          )}

          {importer.phase === "uploading" && (
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}

          {importer.error && (
            <p className="flex items-center gap-2 text-sm text-red-500">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {importer.error}
            </p>
          )}

          {/* ── Result ──────────────────────────────────────────────────────── */}
          {importer.result && (
            <section className={`bg-surface rounded-xl border shadow-card p-5 space-y-3
              ${importer.result.ok ? "border-emerald-500/30" : "border-amber-500/30"}`}>
              <h2 className={`flex items-center gap-2 text-sm font-semibold ${importer.result.ok ? "text-emerald-500" : "text-amber-500"}`}>
                {importer.result.ok ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                {importer.result.ok ? "Import complete" : "Import finished with issues"}
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Created" value={importer.result.created} tone="good" />
                <Stat label="Updated" value={importer.result.updated} />
                <Stat label="Skipped" value={importer.result.skipped} tone="warn" />
              </div>
              {importer.result.errors.length > 0 && (
                <div className="text-sm text-red-500">
                  <p className="font-medium">{importer.result.errors.length} row error(s):</p>
                  <ul className="list-disc list-inside">
                    {importer.result.errors.slice(0, 8).map((e) => <li key={e.index}>{e.title || e.slug}: {e.errors.join("; ")}</li>)}
                  </ul>
                </div>
              )}
              <p className="text-xs text-subtle">
                Imported as <span className="text-foreground">{defaultStatus}</span>. Review them under{" "}
                <Link href={ROUTES.adminPrompts} className="text-primary hover:underline">Prompts</Link>.
              </p>
            </section>
          )}

          {importer.failures.length > 0 && (
            <section className="bg-surface rounded-xl border border-amber-500/30 shadow-card p-4">
              <p className="text-sm font-medium text-amber-500 mb-1">
                {importer.failures.length} image{importer.failures.length === 1 ? "" : "s"} failed to upload (not imported):
              </p>
              <ul className="list-disc list-inside text-xs text-subtle">
                {importer.failures.slice(0, 10).map((f) => <li key={f.filename}>{f.filename} — {f.error}</li>)}
              </ul>
            </section>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}
