"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ResponsePanel.tsx — Left panel of the split-screen report view
//
// Renders the full question for every task type:
//   • Standard tasks: instructions (if any) + prompt text
//   • Task 3/4/8 (image):  context image + prompt text
//   • Task 5 (Comparing):  prompt → choice A/B cards → curveball card
//   • Writing:             instructions (if any) + prompt text
// ─────────────────────────────────────────────────────────────────────────────

import { Mic, PenLine, Shuffle } from "lucide-react";
import type { ChoiceOption, Skill } from "@/lib/types";

interface Props {
  skill:                    Skill;
  taskNumber:               number | undefined;
  promptText:               string;
  instructionsText?:        string | null;
  contextImageUrl?:         string | null;
  choiceOptions?:           ChoiceOption[] | null;
  curveballOption?:         ChoiceOption | null;
  curveballInstructionText?: string | null;
  userResponseText:         string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function taskLabel(skill: Skill, n: number): string {
  if (n === 0) return "Practice";
  if (skill === "writing") {
    return { 1: "Task 1 — Email", 2: "Task 2 — Essay" }[n] ?? `Task ${n}`;
  }
  return ({
    1: "Task 1 — Giving Advice",
    2: "Task 2 — Personal Experience",
    3: "Task 3 — Describing a Scene",
    4: "Task 4 — Making Predictions",
    5: "Task 5 — Comparing & Persuading",
    6: "Task 6 — Difficult Situation",
    7: "Task 7 — Expressing Opinions",
    8: "Task 8 — Unusual Situation",
  } as Record<number, string>)[n] ?? `Task ${n}`;
}

// ── Option card (Task 5) ────────────────────────────────────────────────────

function OptionCard({
  option,
  variant = "default",
  label,
}: {
  option: ChoiceOption;
  variant?: "default" | "curveball";
  label?: string;
}) {
  const isCurve = variant === "curveball";
  return (
    <div className={[
      "rounded-xl border p-3 flex flex-col gap-2",
      isCurve
        ? "border-rose-500/30 bg-rose-500/[0.06]"
        : "border-white/[0.10] bg-white/[0.03]",
    ].join(" ")}>
      {label && (
        <span className={[
          "text-[10px] font-bold uppercase tracking-widest",
          isCurve ? "text-rose-400" : "text-white/35",
        ].join(" ")}>
          {label}
        </span>
      )}
      <p className={["text-sm font-semibold", isCurve ? "text-rose-200" : "text-white/90"].join(" ")}>
        {option.name}
      </p>
      {option.details?.length > 0 && (
        <div className="grid grid-cols-1 gap-1">
          {option.details.map((d) => (
            <div key={d.label} className="flex items-start gap-1.5 text-xs">
              <span className="text-white/35 flex-shrink-0 w-20 truncate">{d.label}</span>
              <span className="text-white/65">{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ResponsePanel({
  skill,
  taskNumber,
  promptText,
  instructionsText,
  contextImageUrl,
  choiceOptions,
  curveballOption,
  curveballInstructionText,
  userResponseText,
}: Props) {
  const isWriting     = skill === "writing";
  const responseLabel = isWriting ? "Your Essay" : "Your Transcript";
  const ResponseIcon  = isWriting ? PenLine : Mic;
  const hasTaskNumber = typeof taskNumber === "number" && !Number.isNaN(taskNumber);
  const isTask5       = skill === "speaking" && taskNumber === 5;
  const wordCount     = userResponseText
    ? userResponseText.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Question Prompt card ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col gap-3 relative overflow-hidden">


        {/* Badge row */}
        <div className="relative flex items-center gap-2 flex-wrap">
          <span className={[
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            isWriting
              ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
              : "border-purple-500/30 bg-purple-500/10 text-purple-300",
          ].join(" ")}>
            {isWriting ? <PenLine className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
            {isWriting ? "Writing" : "Speaking"}
          </span>

          {hasTaskNumber && (
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              {taskLabel(skill, taskNumber!)}
            </span>
          )}
        </div>

        {/* Instructions (writing header / speaking instructions) */}
        {instructionsText && (
          <p className="relative text-xs leading-relaxed text-white/50 italic border-b border-amber-500/15 pb-2">
            {instructionsText}
          </p>
        )}

        {/* Context image (Tasks 3, 4, 8) */}
        {contextImageUrl && (
          <img
            src={contextImageUrl}
            alt="Scene for this task"
            className="block max-w-full max-h-80 w-auto h-auto object-contain rounded-xl"
          />
        )}

        {/* Primary prompt text */}
        {promptText && (
          <p className="relative text-sm leading-relaxed text-white/85 whitespace-pre-wrap text-justify">
            {promptText}
          </p>
        )}

        {/* ── Task 5: choice options + curveball ───────────────────────── */}
        {isTask5 && choiceOptions && choiceOptions.length > 0 && (
          <div className="relative flex flex-col gap-3 border-t border-amber-500/20 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400/70">
              Choice Options
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {choiceOptions.map((opt, i) => (
                <OptionCard
                  key={opt.name ?? i}
                  option={opt}
                  label={i === 0 ? "Option A" : "Option B"}
                />
              ))}
            </div>

            {curveballOption && (
              <div className="flex flex-col gap-2">
                {curveballInstructionText && (
                  <p className="text-xs leading-relaxed text-rose-300/80 italic flex items-start gap-1.5">
                    <Shuffle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {curveballInstructionText}
                  </p>
                )}
                <OptionCard
                  option={curveballOption}
                  variant="curveball"
                  label="Curveball Option"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── User's Response ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col gap-3 lg:flex-1 lg:min-h-0">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <ResponseIcon className="h-4 w-4 text-white/40" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">
              {responseLabel}
            </span>
          </div>
          {userResponseText && (
            <span className="text-[11px] text-white/30 tabular-nums">
              {wordCount} words
            </span>
          )}
        </div>

        {userResponseText ? (
          <div className="lg:overflow-y-auto lg:flex-1 pr-1">
            <p className="text-sm leading-relaxed text-white/75 whitespace-pre-wrap text-justify">
              {userResponseText}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
            <ResponseIcon className="h-8 w-8 opacity-20" />
            <p className="text-sm text-white/30">
              {isWriting
                ? "Essay text not available."
                : "Transcript not available — audio may still be processing."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
