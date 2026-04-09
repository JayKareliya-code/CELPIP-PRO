// ─────────────────────────────────────────────────────────────────────────────
// lib/practice/config.ts
//
// Single source of truth for all practice-feature constants:
//   • SKILL_META   — static display config per skill
//   • getPlanMockLimit — returns the plan-based test limit for a skill
//   • MAX_PRACTICE_SLOTS — upper bound shown in the UI (Ultra limit)
//
// Import from here — never from individual components.
// ─────────────────────────────────────────────────────────────────────────────

import { Mic, PenLine } from "lucide-react";
import {
  STARTER_PLAN_LIMITS,
  PRO_PLAN_LIMITS,
  ULTRA_PLAN_LIMITS,
} from "@/lib/constants";
import type { Skill, UserPlan } from "@/lib/types";
import type { PracticeSkillConfig } from "@/lib/practice/types";

// ── Static skill metadata ─────────────────────────────────────────────────────

export const SKILL_META: Record<Skill, PracticeSkillConfig & { icon: typeof Mic }> = {
  speaking: {
    label:       "Speaking Practice",
    description: "All 9 tasks in one timed session. Recorded and AI-scored automatically.",
    duration:    "~25 min",
    taskSummary: "9 Tasks",
    icon:        Mic,
    color: {
      ring:   "#6366f1",
      bg:     "bg-indigo-600/15",
      border: "border-indigo-500/30",
      text:   "text-indigo-400",
      grad:   "from-indigo-600/20 to-indigo-900/5",
    },
  },
  writing: {
    label:       "Writing Practice",
    description: "Both writing tasks timed together — email and opinion essay.",
    duration:    "~53 min",
    taskSummary: "2 Tasks",
    icon:        PenLine,
    color: {
      ring:   "#10b981",
      bg:     "bg-emerald-600/15",
      border: "border-emerald-500/30",
      text:   "text-emerald-400",
      grad:   "from-emerald-600/20 to-emerald-900/5",
    },
  },
};

// ── Plan-based test limit ─────────────────────────────────────────────────────

/**
 * Returns the number of practice mock tests a user's plan allows for a skill.
 * Used by both the UI (to render slots) and the quota hook.
 */
export function getPlanMockLimit(plan: UserPlan | string, skill: Skill): number {
  switch (plan) {
    case "pro":
      return skill === "speaking"
        ? PRO_PLAN_LIMITS.speaking_mock_tests
        : PRO_PLAN_LIMITS.writing_mock_tests;
    case "ultra":
      return skill === "speaking"
        ? ULTRA_PLAN_LIMITS.speaking_mock_tests
        : ULTRA_PLAN_LIMITS.writing_mock_tests;
    default: // "starter" or unknown
      return skill === "speaking"
        ? STARTER_PLAN_LIMITS.speaking_mock_tests
        : STARTER_PLAN_LIMITS.writing_mock_tests;
  }
}

/**
 * The maximum number of test slots ever shown in the UI.
 * Always the Ultra limit (highest possible) so all plans see the same row count.
 */
export const MAX_PRACTICE_SLOTS = Math.max(
  ULTRA_PLAN_LIMITS.speaking_mock_tests,
  ULTRA_PLAN_LIMITS.writing_mock_tests,
);
