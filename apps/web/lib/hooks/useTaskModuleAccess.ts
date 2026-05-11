// ─────────────────────────────────────────────────────────────────────────────
// lib/hooks/useTaskModuleAccess.ts
//
// SINGLE SOURCE OF TRUTH for "can this user access individual task practice?"
//
// Business rule
// ─────────────
// Individual task practice is accessible when EITHER:
//   a) User is on Pro plan, OR
//   b) User has purchased addon credits for at least one task in this skill
//
// This means a Starter user who buys a Writing Pack or Speaking Pack gets
// task-level access unlocked immediately — without upgrading their plan.
//
// Addon credit locking is PER-TASK:
//   - writing_pack   → credits all writing tasks (task 1 & 2)
//   - speaking_pack  → credits all speaking tasks (task 1–8)
//   - custom_bundle  → credits ONE specific task only
//
// That's why isModuleLocked is a module-level gate (any task has credits),
// while isTaskLocked(taskNum) is the per-card gate.
//
// Usage
// ─────
//   const access = useTaskModuleAccess("writing");
//
//   access.isModuleLocked          // true  → show upgrade CTA, hide task cards as links
//   access.isTaskLocked(1)         // true  → this specific task card is locked
//   access.hasAddonCredits         // true  → at least one task has addon credits
//   access.addonCreditsPerTask     // { 1: 5, 2: 5 }
//   access.plan                    // "starter" | "pro"
//   access.isLoading               // quota still fetching
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useQuota }       from "@/lib/hooks/useQuota";
import type { Skill, UserPlan } from "@/lib/types";

// ── Return type ───────────────────────────────────────────────────────────────

export interface TaskModuleAccess {
  /** User's current plan. */
  plan: UserPlan;

  /**
   * True when the user has no access to ANY individual task in this skill.
   *
   * - Pro plan   → always false  (always has access)
   * - Starter    → true ONLY when they have zero addon credits across all tasks
   *
   * Use this to show/hide the module-level upgrade CTA banner.
   */
  isModuleLocked: boolean;

  /**
   * True when this specific task is inaccessible.
   *
   * - Pro plan       → always false
   * - Starter + addon credits for this task → false
   * - Starter + no credits for this task    → true
   *
   * A Starter user who bought a custom bundle for task 1 only will have:
   *   isTaskLocked(1) === false
   *   isTaskLocked(2) === true
   *
   * Use this per card in the task grid.
   */
  isTaskLocked: (taskNumber: number) => boolean;

  /**
   * True when the user has purchased addon credits for AT LEAST ONE task
   * in this skill (active credits remaining > 0).
   */
  hasAddonCredits: boolean;

  /**
   * Raw map of task_number → available addon credits.
   * Pass this to task grids for per-task effectiveLimit computation.
   */
  addonCreditsPerTask: Record<number, number>;

  /** True while the quota fetch is in-flight. */
  isLoading: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the task-practice access state for a given skill.
 *
 * Centralises the "Starter + addon credits = unlocked" business rule so it
 * is never duplicated across module home, task grid, and folder page components.
 *
 * @param skill  "speaking" | "writing"
 */
export function useTaskModuleAccess(skill: Skill): TaskModuleAccess {
  const { user }    = useCurrentUser();
  const quotaResult = useQuota(skill);

  const plan: UserPlan = user?.plan ?? "starter";

  // ── Addon credits map ──────────────────────────────────────────────────────

  const addonCreditsPerTask: Record<number, number> =
    skill === "writing"
      ? (quotaResult.writing_addon_credits_per_task  ?? {})
      : (quotaResult.speaking_addon_credits_per_task ?? {});

  // ── Derived access flags ───────────────────────────────────────────────────

  // At least one task has remaining credits.
  const hasAddonCredits = Object.values(addonCreditsPerTask).some((c) => c > 0);

  // Pro users always have full access.
  // Starter users are locked UNLESS they have purchased addon credits.
  const isModuleLocked = plan === "starter" && !hasAddonCredits;

  // Per-task lock: Starter locked for a task only if that task has 0 credits.
  const isTaskLocked = (taskNumber: number): boolean => {
    if (plan !== "starter") return false;
    return (addonCreditsPerTask[taskNumber] ?? 0) === 0;
  };

  return {
    plan,
    isModuleLocked,
    isTaskLocked,
    hasAddonCredits,
    addonCreditsPerTask,
    isLoading: quotaResult.isLoading,
  };
}
