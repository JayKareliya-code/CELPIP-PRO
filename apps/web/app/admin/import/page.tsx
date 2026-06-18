"use client";

// ─────────────────────────────────────────────────────────────────────────────
// app/admin/import/page.tsx — Bulk prompt importer (JSON, validate → commit).
//
// Auth guard lives in app/admin/layout.tsx. This page renders its own chrome
// (Navbar / AdminSidebar / Footer) to match the other admin pages.
//
// Flow: pick skill + options → load a JSON array of prompts → Validate (dry run,
// per-row report) → Import (atomic, all-or-nothing on the server).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Upload, FileJson, CheckCircle2, AlertTriangle, Loader2, Download, ArrowRight,
} from "lucide-react";
import { Navbar }       from "@/components/layout/Navbar";
import { Footer }       from "@/components/layout/Footer";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ROUTES }       from "@/lib/constants";
import { ApiError }     from "@/lib/api";
import {
  useBulkImportPrompts,
  type BulkSkill, type BulkConflict, type BulkStatus, type BulkImportResult,
} from "@/lib/hooks/useBulkImportPrompts";

// ── Reference data shown to the author ──────────────────────────────────────────

const REQUIRED_FIELDS: Record<BulkSkill, string> = {
  speaking: "task_number (0–8), title, prompt_text",
  writing:  "task_number (1–2), title, prompt_text, task_type, min_words, time_limit_seconds",
};

const EXAMPLES: Record<BulkSkill, unknown[]> = {
  speaking: [
    {
      task_number: 1,
      title: "Describe your favourite season",
      prompt_text: "Talk about your favourite season of the year and what you enjoy doing then.",
      difficulty: "easy",
      prep_time_seconds: 30,
      response_time_seconds: 60,
      vocabulary_tips: ["refreshing", "cozy"],
      status: "draft",
    },
    {
      task_number: 2,
      title: "Describe a memorable trip",
      prompt_text: "Describe a trip you took that you will never forget.",
    },
  ],
  writing: [
    {
      task_number: 1,
      title: "Email to your landlord",
      prompt_text: "Write an email to your landlord about a repair needed in your apartment.",
      task_type: "email",
      min_words: 150,
      max_words: 200,
      time_limit_seconds: 1620,
    },
    {
      task_number: 2,
      title: "Public transport vs driving",
      prompt_text: "Some people prefer public transport; others prefer driving. Which do you prefer and why?",
      task_type: "survey_response",
      min_words: 150,
      time_limit_seconds: 1620,
    },
  ],
};

/** Accept a bare array, `{items:[…]}`, or `{speaking:[…],writing:[…]}` (picks by skill). */
function extractItems(parsed: unknown, skill: BulkSkill): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj[skill])) return obj[skill] as unknown[];
  }
  throw new Error(
    "Expected a JSON array of prompts, or an object with an \"items\" array.",
  );
}

// ── Small presentational helpers ────────────────────────────────────────────────

function Stat({ label, value, tone = "default" }: {
  label: string; value: number; tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneCls = {
    default: "text-foreground",
    good:    "text-emerald-500",
    warn:    "text-amber-500",
    bad:     "text-red-500",
  }[tone];
  return (
    <div className="bg-muted rounded-lg border border-border px-4 py-3">
      <p className={`text-2xl font-bold tabular-nums ${toneCls}`}>{value}</p>
      <p className="text-xs text-subtle font-medium mt-0.5">{label}</p>
    </div>
  );
}

export default function BulkImportPage() {
  const importer = useBulkImportPrompts();

  const [skill, setSkill]                 = useState<BulkSkill>("speaking");
  const [onConflict, setOnConflict]       = useState<BulkConflict>("error");
  const [defaultStatus, setDefaultStatus] = useState<BulkStatus>("draft");
  const [checkImages, setCheckImages]     = useState(true);

  const [rawText, setRawText]   = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [items, setItems]       = useState<unknown[] | null>(null);

  const [result, setResult]     = useState<BulkImportResult | null>(null);
  const [committed, setCommitted] = useState<BulkImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Any input change invalidates a prior validate/commit result.
  const resetResults = useCallback(() => { setResult(null); setCommitted(null); }, []);

  const parse = useCallback((text: string, nextSkill: BulkSkill) => {
    resetResults();
    if (!text.trim()) { setItems(null); setParseError(null); return; }
    try {
      const list = extractItems(JSON.parse(text), nextSkill);
      if (list.length === 0) throw new Error("The file contains zero prompts.");
      setItems(list);
      setParseError(null);
    } catch (e) {
      setItems(null);
      setParseError(e instanceof Error ? e.message : "Invalid JSON.");
    }
  }, [resetResults]);

  const onTextChange = (text: string) => { setRawText(text); setFileName(null); parse(text, skill); };

  const loadFile = useCallback(async (file: File) => {
    let text: string;
    try {
      text = await file.text();
    } catch {
      setItems(null);
      setParseError("Could not read the selected file. Please try choosing it again.");
      return;
    }
    setRawText(text);
    setFileName(file.name);
    parse(text, skill);
  }, [parse, skill]);

  const onSkillChange = (next: BulkSkill) => {
    setSkill(next);
    if (rawText.trim()) parse(rawText, next); else resetResults();
  };

  const downloadExample = () => {
    const blob = new Blob([JSON.stringify(EXAMPLES[skill], null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `${skill}-prompts-example.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runValidate = async () => {
    if (!items) return;
    setCommitted(null);
    try {
      const res = await importer.mutateAsync({
        skill, mode: "validate", on_conflict: onConflict, default_status: defaultStatus,
        check_images: checkImages, items,
      });
      setResult(res);
    } catch {
      // Error surfaced via importer.error below; nothing more to do here.
    }
  };

  const runCommit = async () => {
    if (!items) return;
    try {
      const res = await importer.mutateAsync({
        skill, mode: "commit", on_conflict: onConflict, default_status: defaultStatus,
        check_images: checkImages, items,
      });
      if (res.ok && res.batch_id) {
        setCommitted(res);
        setResult(null);
        // Clear the input so a stale batch can't be re-committed by accident.
        setItems(null); setRawText(""); setFileName(null);
      } else {
        // The DB changed between validate and commit (e.g. a slug got taken).
        setResult(res);
      }
    } catch {
      // Error surfaced via importer.error below.
    }
  };

  const canImport = !!result && result.mode === "validate" && result.ok && !importer.isPending;
  const apiErr = importer.error instanceof ApiError ? importer.error.message
               : importer.error ? "Request failed." : null;

  const writeCount = useMemo(
    () => result ? result.to_create + result.to_update : 0,
    [result],
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-auto bg-muted px-6 py-8 space-y-6 max-w-4xl mx-auto w-full">

          <div>
            <h1 className="text-xl font-bold text-foreground">Bulk Import Prompts</h1>
            <p className="text-sm text-subtle mt-1">
              Load a JSON file of prompts, validate it, then import the whole batch at once.
              Imports are all-or-nothing — one invalid row blocks the batch until you fix it.
            </p>
          </div>

          {/* ── Step 1: options ─────────────────────────────────────────────── */}
          <section className="bg-surface rounded-xl border border-border shadow-card p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle">1 · Options</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Skill</span>
                <select
                  value={skill}
                  onChange={(e) => onSkillChange(e.target.value as BulkSkill)}
                  className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                >
                  <option value="speaking">Speaking</option>
                  <option value="writing">Writing</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Default status</span>
                <select
                  value={defaultStatus}
                  onChange={(e) => { setDefaultStatus(e.target.value as BulkStatus); resetResults(); }}
                  className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                >
                  <option value="draft">Draft (recommended)</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">On slug conflict</span>
                <select
                  value={onConflict}
                  onChange={(e) => { setOnConflict(e.target.value as BulkConflict); resetResults(); }}
                  className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                >
                  <option value="error">Error (block the batch)</option>
                  <option value="skip">Skip existing</option>
                  <option value="update">Update existing</option>
                </select>
              </label>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={checkImages}
                onChange={(e) => { setCheckImages(e.target.checked); resetResults(); }}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">
                Verify images exist in storage
                <span className="block text-xs text-subtle">
                  HEAD-checks every Task 5 option image and Task 3/4/8 scene image. Uncheck to
                  import references before the images are uploaded.
                </span>
              </span>
            </label>

            <p className="text-xs text-subtle">
              Rows without a <code className="text-foreground">status</code> default to
              <span className="text-foreground"> {defaultStatus}</span>. Rows without a
              <code className="text-foreground"> slug</code> get one auto-generated from the title.
            </p>
          </section>

          {/* ── Step 2: input ───────────────────────────────────────────────── */}
          <section className="bg-surface rounded-xl border border-border shadow-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle">2 · Prompts JSON</h2>
              <button
                onClick={downloadExample}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Download className="w-3.5 h-3.5" /> Download example
              </button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void loadFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
                          px-6 py-8 cursor-pointer transition-colors
                          ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <Upload className="w-6 h-6 text-subtle" />
              <p className="text-sm text-foreground font-medium">
                {fileName ?? "Drop a .json file here, or click to browse"}
              </p>
              <p className="text-xs text-subtle">Required fields: {REQUIRED_FIELDS[skill]}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void loadFile(f); e.target.value = ""; }}
              />
            </div>

            <details className="group">
              <summary className="text-xs font-medium text-subtle cursor-pointer hover:text-foreground">
                …or paste JSON directly
              </summary>
              <textarea
                value={rawText}
                onChange={(e) => onTextChange(e.target.value)}
                rows={8}
                spellCheck={false}
                placeholder='[ { "task_number": 1, "title": "…", "prompt_text": "…" } ]'
                className="mt-2 w-full bg-muted border border-border rounded-lg px-3 py-2 text-xs
                           font-mono text-foreground resize-y"
              />
            </details>

            {parseError && (
              <p className="flex items-center gap-2 text-sm text-red-500">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {parseError}
              </p>
            )}
            {items && !parseError && (
              <p className="flex items-center gap-2 text-sm text-emerald-500">
                <FileJson className="w-4 h-4 shrink-0" /> Parsed {items.length} prompt{items.length === 1 ? "" : "s"}.
              </p>
            )}
          </section>

          {/* ── Step 3: actions ─────────────────────────────────────────────── */}
          <section className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void runValidate()}
              disabled={!items || importer.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-muted border border-border px-4 py-2
                         text-sm font-semibold text-foreground hover:bg-surface disabled:opacity-50
                         disabled:cursor-not-allowed transition-colors"
            >
              {importer.isPending && importer.variables?.mode === "validate"
                ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Validate
            </button>

            <button
              onClick={() => void runCommit()}
              disabled={!canImport}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2
                         text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50
                         disabled:cursor-not-allowed transition-colors"
            >
              {importer.isPending && importer.variables?.mode === "commit"
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ArrowRight className="w-4 h-4" />}
              {writeCount > 0 ? `Import ${writeCount} prompt${writeCount === 1 ? "" : "s"}` : "Import"}
            </button>

            {result && result.mode === "validate" && !result.ok && (
              <span className="text-sm text-amber-500">Fix the errors below, then validate again.</span>
            )}
          </section>

          {apiErr && (
            <p className="flex items-center gap-2 text-sm text-red-500">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {apiErr}
            </p>
          )}

          {/* ── Validation report ───────────────────────────────────────────── */}
          {result && (
            <section className="bg-surface rounded-xl border border-border shadow-card p-5 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-subtle">
                Validation report
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Total rows"  value={result.total} />
                <Stat label="Valid"       value={result.valid} tone={result.ok ? "good" : "warn"} />
                <Stat label="Will create" value={result.to_create} />
                <Stat label="Errors"      value={result.errors.length} tone={result.errors.length ? "bad" : "good"} />
              </div>
              {(result.to_update > 0 || result.to_skip > 0) && (
                <p className="text-xs text-subtle">
                  {result.to_update} will update existing · {result.to_skip} will be skipped.
                </p>
              )}

              {result.warnings.map((w, i) => (
                <p key={i} className="flex items-center gap-2 text-sm text-amber-500">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {w}
                </p>
              ))}

              {result.ok ? (
                <p className="flex items-center gap-2 text-sm text-emerald-500">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  All rows valid — ready to import.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-left text-xs text-subtle border-b border-border">
                        <th className="py-2 pr-4 font-medium">Row</th>
                        <th className="py-2 pr-4 font-medium">Title / slug</th>
                        <th className="py-2 font-medium">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((e) => (
                        <tr key={e.index} className="border-b border-border/50 align-top">
                          <td className="py-2 pr-4 tabular-nums text-subtle">{e.index + 1}</td>
                          <td className="py-2 pr-4 text-foreground">{e.title || e.slug || "—"}</td>
                          <td className="py-2 text-red-500">
                            <ul className="list-disc list-inside space-y-0.5">
                              {e.errors.map((msg, i) => <li key={i}>{msg}</li>)}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* ── Commit success ──────────────────────────────────────────────── */}
          {committed && (
            <section className="bg-surface rounded-xl border border-emerald-500/30 shadow-card p-5 space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-500">
                <CheckCircle2 className="w-5 h-5" /> Import complete
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Created" value={committed.created} tone="good" />
                <Stat label="Updated" value={committed.updated} />
                <Stat label="Skipped" value={committed.skipped} tone="warn" />
              </div>
              <p className="text-xs text-subtle">
                Batch <code className="text-foreground">{committed.batch_id}</code> — recorded in the
                {" "}<Link href={ROUTES.adminAudit} className="text-primary hover:underline">audit log</Link>.
                Imported as <span className="text-foreground">{defaultStatus}</span>; review and publish from
                {" "}<Link href={ROUTES.adminPrompts} className="text-primary hover:underline">Prompts</Link>.
              </p>
            </section>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}
