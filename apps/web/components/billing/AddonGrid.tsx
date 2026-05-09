"use client";

import { PenLine, Mic, SlidersHorizontal, ClipboardList } from "lucide-react";
import { AddonCard } from "./AddonCard";
import type { AddonCardConfig } from "./AddonCard";
import type { CartItem } from "@/store/billingCartStore";

export const SPEAKING_TASK_OPTIONS: Record<string, string> = {
  "speaking-task-1": "Task 1 — Giving Advice",
  "speaking-task-2": "Task 2 — Personal Experience",
  "speaking-task-3": "Task 3 — Describing a Scene",
  "speaking-task-4": "Task 4 — Making Predictions",
  "speaking-task-5": "Task 5 — Comparing & Persuading",
  "speaking-task-6": "Task 6 — Difficult Situation",
  "speaking-task-7": "Task 7 — Expressing Opinions",
  "speaking-task-8": "Task 8 — Unusual Situation",
};

export const WRITING_TASK_OPTIONS: Record<string, string> = {
  "writing-task-1": "Task 1 — Writing an Email",
  "writing-task-2": "Task 2 — Writing an Opinion Essay",
};

// Grouped by module — used by the two-level selector in AddonCard/AddonRow
export const CUSTOM_BUNDLE_MODULES: Record<string, Record<string, string>> = {
  Speaking: SPEAKING_TASK_OPTIONS,
  Writing: WRITING_TASK_OPTIONS,
};

// Mock test slot options (1–5)
export const MOCK_TEST_OPTIONS: Record<string, string> = {
  "1": "Mock Test 1",
  "2": "Mock Test 2",
  "3": "Mock Test 3",
  "4": "Mock Test 4",
  "5": "Mock Test 5",
};

export const ADDONS: AddonCardConfig[] = [
  {
    id: "writing-pack",
    cartType: "writing_pack",
    icon: <PenLine className="w-4 h-4 text-blue-400" />,
    iconBg: "border-white/[0.10] bg-transparent",
    name: "Writing Pack",
    price: 2.99,
    quantityLabel: "5 questions",
    description: "Use across writing tasks to get more detailed AI feedback and improvement tips.",
  },
  {
    id: "speaking-pack",
    cartType: "speaking_pack",
    icon: <Mic className="w-4 h-4 text-emerald-400" />,
    iconBg: "border-white/[0.10] bg-transparent",
    name: "Speaking Pack",
    price: 6.99,
    quantityLabel: "5 questions",
    description: "Use across speaking tasks to practise more without changing your plan.",
  },
  {
    id: "custom-bundle",
    cartType: "custom_bundle",
    icon: <SlidersHorizontal className="w-4 h-4 text-amber-400" />,
    iconBg: "border-white/[0.10] bg-transparent",
    name: "Custom Task Bundle",
    price: 1.99,
    quantityLabel: "5 questions",
    description: "Choose any specific Speaking or Writing task for focused practice exactly where you need it.",
    moduleTaskOptions: CUSTOM_BUNDLE_MODULES,
  },
  {
    id: "mock-bundle",
    cartType: "mock_bundle",
    icon: <ClipboardList className="w-4 h-4 text-violet-400" />,
    iconBg: "border-white/[0.10] bg-transparent",
    name: "Mock Test Bundle",
    price: 2.99,
    quantityLabel: "1 Speaking + 1 Writing mock",
    description: "Add an extra full mock test slot — one complete speaking session and one writing session.",
    mockTestOptions: MOCK_TEST_OPTIONS,
  },
];

interface AddonGridProps {
  onAddToCart: (item: Omit<CartItem, "quantity">) => void;
}

export function AddonGrid({ onAddToCart }: AddonGridProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-white/90 mb-1">Practice Add-ons</h2>
        <p className="text-sm text-white/40">
          Buy extra practice questions without changing your plan.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
        {ADDONS.map((addon) => (
          <AddonCard
            key={addon.id}
            config={addon}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </div>
  );
}

