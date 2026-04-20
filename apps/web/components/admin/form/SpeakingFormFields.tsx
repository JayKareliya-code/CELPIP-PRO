"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/admin/form/SpeakingFormFields.tsx
//
// Speaking-specific form fields.
//   • Tasks 3, 4, 8 → scene image upload widget
//   • Task 5 → two-step tabbed form using OptionEditor (structured key-value
//     rows + optional image per option card)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { ImageIcon, UploadCloud, X }   from "lucide-react";
import { useAuth }                     from "@clerk/nextjs";
import { Field }                       from "@/components/admin/shared/Field";
import { inputCls }                    from "@/components/admin/shared/inputCls";
import { cn }                          from "@/lib/utils";
import { API_V1, authHeaders }         from "@/lib/api";
import { OptionEditor }                from "@/components/admin/form/OptionEditor";
import { SPEAKING_TASK_CONFIG, IMAGE_TASK_NUMBERS } from "@/lib/constants";
import { API_BASE, MAX_UPLOAD_BYTES, IMAGE_ACCEPT_TYPES, stripPresign, uploadFileToS3 } from "@/lib/admin/imageUpload";
import type { SpeakingPrompt, ChoiceOption } from "@/lib/types";

type UploadState = "idle" | "signing" | "uploading" | "done" | "error";

// ── Task 5 two-step form section ──────────────────────────────────────────────

function Task5Fields({ initial }: { initial?: SpeakingPrompt }) {
  const [activeTab, setActiveTab] = useState<"step1" | "step2">("step1");

  const optionA = Array.isArray(initial?.choice_options)
    ? (initial.choice_options[0] as ChoiceOption | null) ?? null
    : null;
  const optionB = Array.isArray(initial?.choice_options)
    ? (initial.choice_options[1] as ChoiceOption | null) ?? null
    : null;
  const curveball    = (initial?.curveball_option ?? null) as ChoiceOption | null;
  const instruction  = initial?.curveball_instruction_text ?? "";
  const defaultIdx   = initial?.default_choice_index ?? 0;

  const tabBase    = "px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors";
  const tabActive  = "border-primary text-primary bg-white/[0.04]";
  const tabInactive= "border-transparent text-subtle hover:text-foreground hover:border-white/20";

  return (
    <div className="space-y-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">Task 5 — Comparing &amp; Persuading</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-medium">
          Two-step
        </span>
      </div>

      {/* Step tabs */}
      <div className="flex gap-1 border-b border-white/[0.08]">
        <button
          type="button"
          onClick={() => setActiveTab("step1")}
          className={cn(tabBase, activeTab === "step1" ? tabActive : tabInactive)}
        >
          Step 1 — Selection
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("step2")}
          className={cn(tabBase, activeTab === "step2" ? tabActive : tabInactive)}
        >
          Step 2 — Curveball
        </button>
      </div>

      {/*
        Both panels are always in the DOM (hidden via CSS class, not conditional rendering).
        This ensures FormData captures all OptionEditor hidden inputs regardless of
        which tab is active.
      */}

      {/* ── Step 1 panel ──────────────────────────────────────────────────── */}
      <div className={cn("space-y-4", activeTab !== "step1" && "hidden")}>
        <p className="text-xs text-subtle">
          The candidate sees the scenario below plus both option cards, then taps one within 60 seconds.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <OptionEditor
            fieldName="choice_option_a"
            label="Option A"
            initial={optionA}
            slot="option-a"
          />
          <OptionEditor
            fieldName="choice_option_b"
            label="Option B"
            initial={optionB}
            slot="option-b"
          />
        </div>
      </div>

      {/* ── Step 2 panel ──────────────────────────────────────────────────── */}
      <div className={cn("space-y-4", activeTab !== "step2" && "hidden")}>
        <p className="text-xs text-subtle">
          After 60-second preparation, the curveball is revealed. The candidate then has 60 seconds to argue
          their Step 1 choice is still better.
        </p>

        {/* Curveball instruction banner text */}
        <Field
          label="Step 2 Instruction Text"
          htmlFor="curveball_instruction_text"
          hint='Shown as the amber banner on the curveball screen. e.g. "She has suddenly taken an interest in Photography. Convince her that your choice is better."'
        >
          <textarea
            id="curveball_instruction_text"
            name="curveball_instruction_text"
            rows={3}
            defaultValue={instruction}
            className={cn(inputCls, "resize-y")}
            placeholder="She has suddenly taken an interest in [Option]. Convince her that your choice is better."
          />
        </Field>

        {/* Curveball option card editor */}
        <OptionEditor
          fieldName="curveball_option"
          label="Curveball Option"
          initial={curveball}
          slot="curveball"
        />

        {/* Default choice (preview / scoring reference) */}
        <Field
          label="Default Selected Choice (preview)"
          htmlFor="default_choice_index"
          hint="Which option appears pre-selected when an admin previews the curveball screen."
        >
          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="radio"
                name="default_choice_index"
                value="0"
                defaultChecked={defaultIdx === 0}
                className="accent-indigo-500"
              />
              Option A
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="radio"
                name="default_choice_index"
                value="1"
                defaultChecked={defaultIdx === 1}
                className="accent-indigo-500"
              />
              Option B
            </label>
          </div>
        </Field>
      </div>
    </div>
  );
}


// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initial?:    SpeakingPrompt;
  taskNumber?: number;
}

export function SpeakingFormFields({ initial, taskNumber }: Props) {
  const showImageField = taskNumber === undefined || IMAGE_TASK_NUMBERS.has(taskNumber);
  const showTask5Field = taskNumber === 5;
  const { getToken }   = useAuth();

  const fileRef   = useRef<HTMLInputElement>(null);
  // Holds the AbortController for the in-flight XHR so we can cancel on unmount
  const abortRef  = useRef<AbortController | null>(null);

  // publicUrl  → stored in the hidden form input → written to DB (ALWAYS the clean path URL)
  const [publicUrl,   setPublicUrl]  = useState<string>(
    initial?.context_image_url ? stripPresign(initial.context_image_url) : ""
  );
  // previewUrl → short-lived presigned GET URL → used only for <img src>
  const [previewUrl,  setPreviewUrl] = useState<string>("");
  const [uploadState, setUpload]     = useState<UploadState>("idle");
  const [progress,    setProgress]   = useState<number>(0);
  const [errorMsg,    setError]      = useState<string>("");

  // ── On mount / prompt change: seed previewUrl from the already-presigned URL in initial data ──
  // The admin list API now returns a 1-hour presigned URL in context_image_url.
  // We use it directly and then also fetch a fresh one (in case the modal was
  // opened close to the 1h expiry — e.g. admin left the page open).
  //
  // ⚠️  Deps include initial?.id and showImageField — NOT [] — so the effect
  // re-runs when the user opens a second prompt for editing (different initial.id).
  // With [] the preview was permanently stuck showing the first prompt's image
  // (or blank) for all subsequent edits in the same session.
  useEffect(() => {
    // Reset all upload state for the new prompt
    setUpload("idle");
    setProgress(0);
    setError("");

    const url   = initial?.context_image_url;
    const clean = url ? stripPresign(url) : "";

    // Always sync publicUrl with the current prompt's stored image URL so the
    // hidden form input has the correct value when submitted.
    //
    // Base UI keeps DialogContent (and therefore SpeakingFormFields) mounted even
    // when the dialog is closed — meaning the same component instance is reused
    // across different edit sessions.  Without this setPublicUrl call, the hidden
    // input retains the PREVIOUS prompt's value (or "") when a new prompt is opened.
    setPublicUrl(clean);

    if (!url || !showImageField) {
      setPreviewUrl("");
      return;
    }

    // Immediately show what we already have (presigned from list API)
    setPreviewUrl(url);

    // Then refresh silently in the background in case it's near expiry
    if (!initial?.id) return;
    getToken().then(token =>
      fetch(`${API_BASE}${API_V1}/admin/speaking-prompts/${initial.id}/image-preview`, {
        headers: authHeaders(token),
      })
      .then(r => r.ok ? r.json() : null)
      .then((data: { preview_url: string } | null) => {
        if (data?.preview_url) setPreviewUrl(data.preview_url);
      })
      .catch(() => { /* keep the one from list API */ })
    );

    // Abort any in-flight XHR when we switch prompts or the component unmounts
    return () => { abortRef.current?.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id, showImageField]);


  // ── Upload handler ─────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`File too large — max 5 MB (this file is ${(file.size / 1024 / 1024).toFixed(1)} MB)`);
      setUpload("error");
      return;
    }

    setError("");
    setUpload("signing");
    setProgress(0);

    try {
      // Step 1 — get presigned PUT + preview URLs from backend
      const token = await getToken();
      const res   = await fetch(`${API_BASE}${API_V1}/admin/speaking-prompts/image-upload-url`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body:    JSON.stringify({
          task_number: taskNumber ?? 3,
          filename:    file.name,
          mime_type:   file.type,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string })?.detail ?? `Server error ${res.status}`);
      }

      const data = await res.json() as {
        upload_url:  string;
        public_url:  string;
        preview_url: string;  // presigned GET — valid 1 hour
        s3_key:      string;
      };

      // Step 2 — PUT file body directly to S3 with XHR for progress tracking
      setUpload("uploading");
      const controller = new AbortController();
      abortRef.current = controller;
      await uploadFileToS3(
        data.upload_url,
        file,
        file.type,
        setProgress,
        controller.signal,
      );
      abortRef.current = null;

      // Step 3 — store public_url in form (DB), preview_url for <img>
      setPublicUrl(data.public_url);   // → hidden input → DB
      setPreviewUrl(data.preview_url); // → <img src> (presigned, works on private bucket)
      setUpload("done");
      setProgress(100);

    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return; // silent on unmount
      setError(err instanceof Error ? err.message : "Upload failed");
      setUpload("error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleClear() {
    setPublicUrl("");
    setPreviewUrl("");
    setUpload("idle");
    setProgress(0);
    setError("");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const isBusy    = uploadState === "signing" || uploadState === "uploading";
  const hasImage  = Boolean(previewUrl || publicUrl);

  // ── Derive task-appropriate timing defaults ─────────────────────────────
  // When creating a NEW prompt: use SPEAKING_TASK_CONFIG defaults for the task.
  // When EDITING an existing prompt: always use the saved DB values.
  const taskKey = (taskNumber === 0 ? "practice" : taskNumber) as keyof typeof SPEAKING_TASK_CONFIG;
  const taskCfg = SPEAKING_TASK_CONFIG[taskKey] ?? SPEAKING_TASK_CONFIG.practice;
  const defaultPrepTime     = initial?.prep_time_seconds      ?? taskCfg.prep;
  const defaultResponseTime = initial?.response_time_seconds  ?? taskCfg.response;

  return (
    <>
      {/* ── Timing ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Prep Time (sec)"
          htmlFor="prep_time_seconds"
          hint={taskNumber !== undefined ? `Standard for Task ${taskNumber === 0 ? "0 (Practice)" : taskNumber}: ${taskCfg.prep}s` : undefined}
          required
        >
          <input id="prep_time_seconds" name="prep_time_seconds" type="number" min={0} required
            defaultValue={defaultPrepTime} className={inputCls} />
        </Field>
        <Field
          label="Response Time (sec)"
          htmlFor="response_time_seconds"
          hint={taskNumber !== undefined ? `Standard for Task ${taskNumber === 0 ? "0 (Practice)" : taskNumber}: ${taskCfg.response}s` : undefined}
          required
        >
          <input id="response_time_seconds" name="response_time_seconds" type="number" min={1} required
            defaultValue={defaultResponseTime} className={inputCls} />
        </Field>
      </div>

      {/* ── Difficulty ──────────────────────────────────────────────────── */}
      <Field label="Difficulty" htmlFor="difficulty" required>
        <select id="difficulty" name="difficulty" required
          defaultValue={initial?.difficulty ?? "medium"} className={inputCls}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </Field>

      {/* ── Scene Image (Tasks 3, 4, 8) ─────────────────────────────────── */}
      {showImageField && (
        <Field
          label="Scene Image"
          htmlFor="scene-image-picker"
          hint={
            taskNumber !== undefined
              ? "Tasks 3 & 4 share one image per prompt set. Task 8 uses a unique image per prompt."
              : "Required for Tasks 3, 4, 8. Leave blank for text-only tasks."
          }
        >
          {/* Hidden input — submitted with form, value saved to DB */}
          <input type="hidden" name="context_image_url" value={publicUrl} />

          <div className="space-y-3">
            {/* Drop zone */}
            <div
              onClick={() => !isBusy && fileRef.current?.click()}
              className={cn(
                "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed",
                "h-24 cursor-pointer transition-colors text-xs",
                isBusy
                  ? "border-primary/40 bg-primary/5 cursor-not-allowed"
                  : "border-border hover:border-primary/50 hover:bg-white/5",
              )}
            >
              <input
                ref={fileRef}
                id="scene-image-picker"
                type="file"
                accept={IMAGE_ACCEPT_TYPES}
                className="sr-only"
                onChange={handleFileChange}
                disabled={isBusy}
              />

              {isBusy ? (
                <>
                  <div className="w-32 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-subtle/60">
                    {uploadState === "signing" ? "Getting upload URL…" : `Uploading… ${progress}%`}
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-5 h-5 text-subtle/40" />
                  <span className="text-subtle/50">
                    {hasImage ? "Click to replace image" : "Click to upload scene image"}
                    <span className="ml-1 text-subtle/30">· JPG, PNG, WebP · max 5 MB</span>
                  </span>
                </>
              )}
            </div>

            {/* Error */}
            {uploadState === "error" && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <X className="w-3 h-3" /> {errorMsg}
              </p>
            )}

            {/* Preview — always uses presigned URL, never the raw public_url */}
            {previewUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-border bg-muted h-36">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Scene preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                    {uploadState === "done" ? "Uploaded ✓" : "Saved"}
                  </span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="bg-red-600/80 hover:bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className={cn(
                "flex items-center justify-center gap-2 rounded-lg border border-dashed border-border",
                "h-16 text-subtle/40 text-xs",
              )}>
                <ImageIcon className="w-4 h-4" />
                <span>
                  {publicUrl
                    ? "Loading preview…"
                    : "No image yet — upload one above"}
                </span>
              </div>
            )}
          </div>
        </Field>
      )}

      {/* ── Task 5 Two-Step Form ─────────────────────────────────────────── */}
      {showTask5Field && <Task5Fields initial={initial} />}
    </>
  );
}

