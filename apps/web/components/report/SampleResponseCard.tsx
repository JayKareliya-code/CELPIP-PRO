"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SampleResponseCard.tsx — Collapsible high-band sample answer
//
// P1 upgrade: copy-to-clipboard button so users can paste the sample response
// into their notes or reading-aloud practice.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { ChevronDown, Copy, Check, Star } from "lucide-react";

interface Props {
  sampleResponse: string;
  targetBand?: number | null;
}

export function SampleResponseCard({ sampleResponse, targetBand }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!sampleResponse) return null;

  const wordCount = sampleResponse.trim().split(/\s+/).filter(Boolean).length;

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
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-400/60" />
          <span className="text-sm font-semibold uppercase tracking-wider text-white/40">
            {targetBand ? `Band ${targetBand}+ Sample Response` : "High-Band Sample Response"}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-white/30 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-5 py-4 flex flex-col gap-3">

            {/* Header row: word count + copy button */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/30 tabular-nums">{wordCount} words</span>
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
                {copied ? (
                  <><Check className="h-3 w-3" /> Copied!</>
                ) : (
                  <><Copy className="h-3 w-3" /> Copy</>
                )}
              </button>
            </div>

            {/* Sample text */}
            <p className="text-sm leading-relaxed text-white/80 italic">
              &ldquo;{sampleResponse}&rdquo;
            </p>

            {/* Disclaimer */}
            <p className="text-xs text-white/25 border-t border-white/[0.05] pt-3">
              AI-generated example targeting Band {targetBand ? `${targetBand}+` : "9–10"}.
              Read it aloud 2–3 times to internalize the structure — don&apos;t memorise it verbatim.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
