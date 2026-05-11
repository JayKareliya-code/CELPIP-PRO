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
      ring:   "#C8963E",
      bg:     "bg-amber-600/15",
      border: "border-amber-500/30",
      text:   "text-amber-400",
      grad:   "from-amber-600/20 to-amber-900/5",
    },
  },
  writing: {
    label:       "Writing Practice",
    description: "Both writing tasks timed together — email and opinion essay.",
    duration:    "~53 min",
    taskSummary: "2 Tasks",
    icon:        PenLine,
    color: {
      ring:   "#D4A853",
      bg:     "bg-yellow-600/15",
      border: "border-yellow-500/30",
      text:   "text-yellow-400",
      grad:   "from-yellow-600/20 to-yellow-900/5",
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
    default: // "starter" or unknown
      return skill === "speaking"
        ? STARTER_PLAN_LIMITS.speaking_mock_tests
        : STARTER_PLAN_LIMITS.writing_mock_tests;
  }
}

/**
 * The maximum number of test slots ever shown in the UI.
 * Always the Pro limit (highest plan) so all plans see the same row count.
 */
export const MAX_PRACTICE_SLOTS = Math.max(
  PRO_PLAN_LIMITS.speaking_mock_tests,
  PRO_PLAN_LIMITS.writing_mock_tests,
);

// ── Mock Exam constants ─────────────────────────────────────────────────────────────────

/** Seconds of rest displayed between tasks in a full mock speaking exam. */
export const MOCK_EXAM_BREAK_SECONDS = 30;

/** Ordered task numbers that make up a full CELPIP speaking mock exam. */
export const MOCK_EXAM_TASK_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type MockExamTaskNumber = typeof MOCK_EXAM_TASK_NUMBERS[number];

/**
 * S3 folder prefix for mock exam audio recordings.
 * Kept separate from individual practice attempts (which use "speaking/").
 */
export const MOCK_EXAM_S3_PREFIX = "mock-tests" as const;
