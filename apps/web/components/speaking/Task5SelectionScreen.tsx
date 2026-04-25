// ─────────────────────────────────────────────────────────────────────────────
// Task5SelectionScreen.tsx — PREP phase for Task 5 (Comparing & Persuading)
//
// Everything fits in one viewport — no scrolling required.
// Layout (top → bottom, flex-col h-screen):
//   1. Compact header: timer ring + badge side by side
//   2. Scenario prompt card (text-base, readable)
//   3. Option cards row — flex-1 grows to fill remaining space
//   4. Guidance line (one line, xs)
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { CheckCircle2 }      from "lucide-react";
import { TimerRing }         from "@/components/common/TimerRing";
import { TimerDisplay }      from "@/components/common/TimerDisplay";
import { cn }                from "@/lib/utils";
import type { ChoiceOption } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Task5SelectionScreenProps {
  secondsLeft:      number;
  totalPrepSeconds: number;
  promptText:       string;
  choiceOptions:    ChoiceOption[];
  /** Currently selected option — controlled by the parent (practice or mock exam store). */
  selectedChoice:   ChoiceOption | null;
  /** Callback when the user taps an option card. */
  onSelect:         (option: ChoiceOption) => void;
}

// ── Option Card ───────────────────────────────────────────────────────────────

function OptionCard({
  option,
  index,
  isSelected,
  onSelect,
}: {
  option:     ChoiceOption;
  index:      number;
  isSelected: boolean;
  onSelect:   (o: ChoiceOption) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option)}
      className={cn(
        // flex-1 min-w-0: equal-width in the sm:flex-row; no flex-col so no vertical growth
        "relative flex-1 min-w-0 rounded-2xl border-2 overflow-hidden",
        "text-left transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
        isSelected
          ? "border-amber-500 bg-amber-500/10 shadow-[0_0_24px_rgba(245,158,11,0.25)]"
          : "border-white/[0.10] bg-white/[0.03] hover:border-white/[0.20] hover:bg-white/[0.06]"
      )}
    >
      {/* Image — capped at 25 vh, object-contain = full image visible, no crop */}
      {option.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={option.image_url}
          alt={option.name}
          className="w-full max-h-[25vh] object-contain shrink-0"
        />
      )}

      {/* Card text content */}
      <div className="relative p-4">
        {/* Selected checkmark — inside the text zone, not overlapping the image */}
        {isSelected && (
          <span className="absolute top-2 right-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </span>
        )}

        <h3 className={cn(
          "text-base font-bold underline underline-offset-2 pr-6",
          isSelected ? "text-amber-200" : "text-foreground"
        )}>
          {option.name}
        </h3>

        <ul className="space-y-0.5">
          {option.details.map((d, i) => (
            <li key={i} className="text-sm leading-snug">
              <span className="font-medium text-foreground/70">{d.label}:</span>{" "}
              <span className="text-canvas-subtle">{d.value}</span>
            </li>
          ))}
        </ul>

        {/* Letter badge */}
        <div className={cn(
          "absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
          isSelected ? "bg-amber-500 text-white" : "bg-white/[0.06] text-white/40"
        )}>
          {index === 0 ? "A" : "B"}
        </div>
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Task5SelectionScreen({
  secondsLeft,
  totalPrepSeconds,
  promptText,
  choiceOptions,
  selectedChoice,
  onSelect,
}: Task5SelectionScreenProps) {

  const selectedIndex = selectedChoice
    ? choiceOptions.findIndex((o) => o.name === selectedChoice.name)
    : -1;

  const hasSelected = Boolean(selectedChoice);
  const isUrgent    = secondsLeft <= 10;

  return (
    // h-screen + overflow-hidden → the entire session lives in one viewport, no scroll
    <div className="flex flex-col h-screen overflow-hidden bg-canvas px-4 pt-2 pb-3 gap-3 items-center">

      {/* ── 1. Compact header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 w-full max-w-3xl shrink-0">

        {/* Timer ring: shrunk to 72 px so header stays compact */}
        <div className="relative flex items-center justify-center shrink-0">
          <TimerRing
            secondsLeft={secondsLeft}
            totalSeconds={totalPrepSeconds}
            sizePx={72}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <TimerDisplay
              secondsLeft={secondsLeft}
              variant="dark"
              size="sm"
              pulseWhenCritical
            />
          </div>
        </div>

        {/* Badge + urgent warning */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-primary px-3 py-1 rounded-full border border-primary/30 bg-primary/10 w-fit select-none">
            Selection Time
          </span>
          {isUrgent && !hasSelected && (
            <p className="text-xs text-amber-400 font-medium animate-pulse">
              ⚡ Select an option before time runs out!
            </p>
          )}
        </div>
      </div>

      {/* ── 2. Scenario prompt ────────────────────────────────────────────── */}
      <div className="w-full max-w-3xl shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-canvas-subtle/50 mb-1 select-none">
          Your scenario
        </p>
        <p className="text-base leading-relaxed text-canvas-text">{promptText}</p>
      </div>

      {/* ── 3. Option cards — natural height, shrink-0 so they don't blow up ─── */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-3xl shrink-0">
        {choiceOptions.map((option, i) => (
          <OptionCard
            key={i}
            option={option}
            index={i}
            isSelected={selectedIndex === i}
            onSelect={option => onSelect(option)}
          />
        ))}
      </div>

      {/* ── 4. Guidance — single line at bottom ──────────────────────────── */}
      <p className="text-xs text-canvas-subtle/60 text-center shrink-0">
        {hasSelected
          ? `✓ You chose "${selectedChoice!.name}". Use the remaining time to prepare.`
          : "Tap the option you think is best. The timer advances automatically."}
      </p>
    </div>
  );
}
