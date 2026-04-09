// ─────────────────────────────────────────────────────────────────────────────
// lib/practice/types.ts
//
// All domain types for the Practice feature.
// ─────────────────────────────────────────────────────────────────────────────

import type { Skill } from "@/lib/types";

// ── Quota ─────────────────────────────────────────────────────────────────────

/** Per-skill quota status, derived from the backend quota response. */
export interface PracticeQuota {
  skill:     Skill;
  limit:     number;   // plan-based max tests allowed
  used:      number;   // tests consumed so far
  remaining: number;   // max(0, limit - used)
  /** True when the user is over their plan limit and cannot start a new test. */
  exhausted: boolean;
}

// ── Test slot ─────────────────────────────────────────────────────────────────

/** Data for a single practice test slot ("Full Practice N"). */
export interface PracticeTestSlotData {
  /** 1-indexed slot number (1 = "Full Practice 1"). */
  slotNumber:     number;
  isUsed:         boolean;              // user has attempted this slot
  isLocked:       boolean;              // slot is beyond plan limit
  estimatedBand?: number | null;        // band score if completed
  attemptId?:     string;              // UUID of the attempt, for linking to report
}

// ── Skill config ──────────────────────────────────────────────────────────────

/** Static display metadata for a skill. Consumed by UI components. */
export interface PracticeSkillConfig {
  label:       string;           // "Speaking Practice"
  description: string;           // shown in cards
  duration:    string;           // "~25 min"
  taskSummary: string;           // "9 Tasks"
  color: {
    ring:   string;              // hex, used by SVG strokes
    bg:     string;              // Tailwind bg class
    border: string;              // Tailwind border class
    text:   string;              // Tailwind text class
    grad:   string;              // Tailwind gradient classes for card splash
  };
}
