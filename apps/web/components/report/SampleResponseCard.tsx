"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SampleResponseCard.tsx — Collapsible targeted-rewrite sample answer
//
// Renders the sample_response with proper paragraph formatting so emails
// look like emails and essays look like essays (not a flat italic blob).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { ChevronDown, Copy, Check, Star } from "lucide-react";

interface Props {
  sampleResponse: string;
  targetBand?:    number | null;
  taskNumber?:    number;
}

export function SampleResponseCard({ sampleResponse, targetBand, taskNumber }: Props) {
  const [open,   setOpen]   = useState(false);
  const [copied, setCopied] = useState(false);

  if (!sampleResponse) return null;

  // Split on blank lines — preserves email salutation/closing and essay paragraphs
  const paragraphs = sampleResponse
    .trim()
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  const wordCount = sampleResponse.trim().split(/\s+/).filter(Boolean).length;

  const isEmail   = taskNumber === 1;
  const taskLabel = isEmail ? "Email · Task 1" : taskNumber === 2 ? "Essay · Task 2" : undefined;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(sampleResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — fail silently
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">

      {/* ── Collapsed header ──────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <Star className="h-4 w-4 text-amber-400/60 flex-shrink-0" />
          <div>
            <span className="text-sm font-semibold text-white/55">
              {targetBand ? `Band ${targetBand}+ Sample Response` : "Sample Response"}
            </span>
            {taskLabel && (
              <span className="ml-2 text-[10px] text-white/25 font-normal">{taskLabel}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[10px] text-white/25 tabular-nums hidden sm:block">
            {wordCount} words
          </span>
          <ChevronDown
            className={`h-4 w-4 text-white/30 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* ── Expandable body ───────────────────────────────────────────────── */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-5 py-4 flex flex-col gap-4">

            {/* Targeted rewrite notice */}
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-3.5 py-2.5">
              <Star className="h-3.5 w-3.5 text-amber-400/60 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-amber-300/60">
                <span className="font-semibold text-amber-300/80">Targeted rewrite</span>
                {" "}— this response directly corrects the weaknesses in your submission. Study the
                differences to understand what a higher band looks like for this exact prompt.
              </p>
            </div>

            {/* Copy button row */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/25 tabular-nums sm:hidden">{wordCount} words</span>
              <div className="ml-auto">
                <button
                  onClick={handleCopy}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all duration-200",
                    copied
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20 hover:text-white/60",
                  ].join(" ")}
                  aria-label="Copy sample response"
                >
                  {copied ? <><Check className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
                </button>
              </div>
            </div>

            {/* ── Response body — paragraph-aware rendering ─────────────── */}
            <div className={`flex flex-col gap-3 rounded-xl border border-white/[0.06] p-4
              ${isEmail ? "bg-white/[0.015] font-mono text-[13px]" : "bg-white/[0.015] text-sm"}`}
            >
              {paragraphs.map((para, i) => {
                // Detect email structural lines: salutation, closing, name
                const isSalutation = isEmail && i === 0 && /^dear\b/i.test(para);
                const isClosing    = isEmail && i >= paragraphs.length - 2 &&
                  /^(sincerely|regards|best|yours|thank you)/i.test(para);

                return (
                  <p
                    key={i}
                    className={[
                      "leading-relaxed",
                      isSalutation || isClosing
                        ? "text-white/90 font-medium"
                        : "text-white/75",
                    ].join(" ")}
                  >
                    {/* Preserve internal newlines within a paragraph (e.g. "Sincerely,\nJohn") */}
                    {para.split(/\n/).map((line, j) => (
                      <span key={j}>
                        {line}
                        {j < para.split(/\n/).length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                );
              })}
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] leading-relaxed text-white/20 border-t border-white/[0.05] pt-3">
              AI-generated example targeting Band {targetBand ? `${targetBand}+` : "9–10"}.
              Read it carefully, then rewrite your own version from scratch — do not copy verbatim.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
