// ─────────────────────────────────────────────────────────────────────────────
// Task5SelectionScreen.tsx — PREP phase for Task 5 (Comparing & Persuading)
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import Image                  from "next/image";
import { CheckCircle2 }       from "lucide-react";
import { TaskIdentityStrip }  from "@/components/speaking/TaskIdentityStrip";
import { TimerCard }          from "@/components/speaking/TimerCard";
import { TaskPromptBox }      from "@/components/speaking/TaskPromptBox";
import { cn }                 from "@/lib/utils";
import type { ChoiceOption }  from "@/lib/types";

interface Task5SelectionScreenProps {
  secondsLeft:          number;
  totalPrepSeconds:     number;
  totalResponseSeconds: number;
  promptText:           string;
  choiceOptions:        ChoiceOption[];
  selectedChoice:       ChoiceOption | null;
  onSelect:             (option: ChoiceOption) => void;
  taskNumber?:          number;
  taskTitle?:           string;
  showInfoBar?:         boolean;
}

// ── Option card ───────────────────────────────────────────────────────────────

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
        "relative flex-1 min-w-0 rounded-2xl border-2 overflow-hidden text-left",
        "transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isSelected
          ? "border-primary/60 bg-white/[0.04]"
          : "border-border/40 bg-white/[0.02] hover:border-border hover:bg-white/[0.04]",
      )}
    >
      {option.image_url && (
        <Image
          src={option.image_url}
          alt={option.name}
          width={400}
          height={240}
          sizes="(max-width: 768px) 50vw, 25vw"
          className="w-full max-h-[22vh] object-contain"
        />
      )}

      <div className="relative p-4">
        {isSelected && (
          <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-primary" />
        )}
        <div className="flex items-start gap-2 pr-6">
          {/* Letter badge */}
          <span className={cn(
            "shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
            isSelected ? "bg-primary text-primary-foreground" : "bg-white/[0.06] text-canvas-subtle",
          )}>
            {index === 0 ? "A" : "B"}
          </span>
          <div className="min-w-0">
            <h3 className={cn(
              "text-sm font-bold mb-1.5",
              isSelected ? "text-primary" : "text-canvas-text",
            )}>
              {option.name}
            </h3>
            <ul className="space-y-1">
              {option.details.map((d, i) => (
                <li key={i} className="text-xs leading-snug flex gap-1">
                  <span className="text-canvas-text/90 font-semibold shrink-0">{d.label}:</span>
                  <span className="text-canvas-text/75">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function Task5SelectionScreen({
  secondsLeft,
  totalPrepSeconds,
  totalResponseSeconds,
  promptText,
  choiceOptions,
  selectedChoice,
  onSelect,
  taskNumber = 5,
  taskTitle  = "Comparing and Persuading",
  showInfoBar = true,
}: Task5SelectionScreenProps) {
  const selectedIndex = selectedChoice
    ? choiceOptions.findIndex(o => o.name === selectedChoice.name)
    : -1;

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 sm:px-6 lg:px-8 py-8 w-full max-w-5xl mx-auto">

        {/* Task identity strip — inline, above scenario card */}
        {showInfoBar && (
          <TaskIdentityStrip
            taskNumber={taskNumber}
            taskTitle={taskTitle}
            prepSeconds={totalPrepSeconds}
            responseSeconds={totalResponseSeconds}
            className="w-full"
          />
        )}

        {/* Scenario */}
        <TaskPromptBox
          promptText={promptText}
          variant="overlay"
          label="Your scenario"
          className="w-full"
        />

        {/* Urgency — no emoji, just text */}
        {secondsLeft <= 10 && !selectedChoice && (
          <p className="text-xs text-danger font-medium">
            Select an option before time runs out
          </p>
        )}

        {/* Option cards */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {choiceOptions.map((option, i) => (
            <OptionCard key={option.name} option={option} index={i}
              isSelected={selectedIndex === i} onSelect={onSelect} />
          ))}
        </div>

        {/* Timer */}
        <TimerCard
          secondsLeft={secondsLeft}
          totalSeconds={totalPrepSeconds}
          label="Selection Time"
          className="w-full"
        />

        {/* Guidance */}
        <p className="text-xs text-canvas-subtle/50 text-center">
          {selectedChoice
            ? `Chose "${selectedChoice.name}". Use the remaining time to prepare your arguments.`
            : "Tap the option you think is best. You can change your selection before time runs out."}
        </p>
      </div>
    </div>
  );
}
