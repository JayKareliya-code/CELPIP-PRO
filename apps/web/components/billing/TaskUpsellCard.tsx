"use client";

// ─────────────────────────────────────────────────────────────────────────────
// TaskUpsellCard — Shared "Custom Task Bundle" upsell card.
//
// Used by both TaskPromptsFolder (Speaking) and WritingTaskPromptsFolder.
// Props:
//   skill      — "speaking" | "writing" (determines task list + cart metadata)
//   taskNumber — pre-selects the current task in the dropdown
//
// Cart item shape sent to backend:
//   type:     "custom_bundle"
//   metadata: { task_key: "speaking-task-1" }  ← validated by KNOWN_TASK_KEYS
// ─────────────────────────────────────────────────────────────────────────────

import { useState }             from "react";
import { Sliders, Check, ShoppingCart } from "lucide-react";
import { toast }                from "sonner";
import { useBillingCartStore }  from "@/store/billingCartStore";

// ── Task title maps ───────────────────────────────────────────────────────────

const SPEAKING_TASK_TITLES: Record<number, string> = {
  1: "Giving Advice",
  2: "Personal Experience",
  3: "Describing a Scene",
  4: "Making Predictions",
  5: "Comparing & Persuading",
  6: "Difficult Situation",
  7: "Expressing Opinions",
  8: "Unusual Situation",
};

const WRITING_TASK_TITLES: Record<number, string> = {
  1: "Writing an Email",
  2: "Writing an Opinion Essay",
};

// ── Component ─────────────────────────────────────────────────────────────────

interface TaskUpsellCardProps {
  skill:      "speaking" | "writing";
  taskNumber: number;
}

export function TaskUpsellCard({ skill, taskNumber }: TaskUpsellCardProps) {
  const taskTitles = skill === "speaking" ? SPEAKING_TASK_TITLES : WRITING_TASK_TITLES;
  const taskKeys   = Object.keys(taskTitles).map(Number);

  const [selectedTask, setSelectedTask] = useState<number>(taskNumber);

  const addItem = useBillingCartStore((s) => s.addItem);

  const handleAddToCart = () => {
    const taskKey = `${skill}-task-${selectedTask}`; // e.g. "speaking-task-1"
    addItem({
      id:        `custom-bundle-${taskKey}`,          // unique per task
      type:      "custom_bundle",
      name:      "Custom Task Bundle",
      subtitle:  `Task ${selectedTask} — ${taskTitles[selectedTask] ?? ""}`,
      unitPrice: 1.99,
      currency:  "CAD",
      metadata:  { task_key: taskKey },               // ← backend validates this key
    });
    toast.success("Custom Task Bundle added to cart", {
      description: `Task ${selectedTask} — ${taskTitles[selectedTask] ?? ""}`,
      duration: 2500,
    });
  };

  return (
    <div className="relative flex flex-col h-full rounded-xl border border-white/[0.09] bg-surface overflow-hidden">

      {/* Top: Sliders icon + title + price */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center justify-center shrink-0">
          <Sliders className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xl font-extrabold text-white leading-tight">Custom Task Bundle</span>
        </div>
        <div className="flex items-baseline gap-0.5 shrink-0">
          <span className="text-xl font-extrabold text-white tabular-nums">$1.99</span>
          <span className="text-[10px] text-white/35 ml-0.5">CAD</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.08]" />

      {/* Body */}
      <div className="px-3 py-2.5 flex flex-col gap-2 flex-1">
        {/* Check bullet */}
        <div className="flex items-center gap-1.5">
          <Check className="w-3 h-3 shrink-0 text-primary" />
          <span className="text-xs text-white/60 leading-tight">Adds 5 questions for selected task</span>
        </div>

        {/* Task dropdown — pre-selected to current task */}
        <div className="relative">
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(Number(e.target.value))}
            className="w-full appearance-none rounded-md border border-white/[0.10] bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/75 font-medium pr-7 focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
          >
            {taskKeys.map((n) => (
              <option key={n} value={n} className="bg-[#1a1a1a] text-white">
                Task {n} — {taskTitles[n]}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/40">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-3 pb-3 mt-auto">
        <button
          onClick={handleAddToCart}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg font-semibold text-xs transition-all duration-200 border border-primary/40 text-primary hover:border-primary hover:bg-primary/[0.08] active:scale-[0.98]"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Add to cart
        </button>
      </div>
    </div>
  );
}
