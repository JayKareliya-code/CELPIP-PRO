// ─────────────────────────────────────────────────────────────────────────────
// lib/hooks/useWritingQuota.ts
//
// Centralised per-task writing quota hook.
//
// Why this hook exists
// ─────────────────────
// The quota limit for a writing task is:
//
//   effectiveLimit = planLimit + addonCredits
//
// where:
//   planLimit    = STARTER_PLAN_LIMITS / PRO_PLAN_LIMITS (from constants.ts)
//   addonCredits = purchased extra attempts from addon_credits table (backend)
//                  - writing_pack purchase → credits added to BOTH writing tasks
//                  - custom_bundle (e.g. "writing-task-1") → credits only for Task 1
//
// Without this hook the formula was copy-pasted across WritingModuleHome and
// WritingTaskPromptsFolder — neither location accounted for add-on credits,
// making the displayed limit wrong the moment a user purchased a pack.
//
// Usage
// ─────
//   // Task-specific (WritingTaskPromptsFolder, etc.)
//   const { effectiveLimit, used, remaining, isBonusRetry, isLoading } =
//     useWritingQuota(taskNumber);
//
//   // Plan-level overview (WritingModuleHome stats strip)
//   const { effectiveLimit, plan, isLoading } = useWritingQuota(null);
//   //  → used / remaining / isBonusRetry are 0 / 0 / false when taskNumber=null
//
// Scalability
// ────────────
// When the backend adds writing_addon_credits_per_task to QuotaStatusResponse
// (already implemented in useQuota.ts), this hook picks it up automatically.
// No component changes are ever needed to wire in future addon types.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useCurrentUser }           from "@/lib/hooks/useCurrentUser";
import { useQuota }                 from "@/lib/hooks/useQuota";
import { PRO_PLAN_LIMITS, STARTER_PLAN_LIMITS } from "@/lib/constants";
import type { UserPlan }            from "@/lib/types";

// ── Return type ───────────────────────────────────────────────────────────────

export interface WritingTaskQuotaResult {
  /** The user's current plan. */
  plan:           UserPlan;

  /** Plan baseline quota (from constants — no add-ons). */
  planLimit:      number;

  /**
   * Purchased add-on credits available for this specific task.
   *
   * - writing_pack purchase → credits added to all writing tasks
   *   (the webhook expands one pack purchase into rows per task).
   * - custom_bundle for writing-task-N → credits only for Task N.
   *
   * Always 0 when taskNumber is null (plan-overview mode).
   */
  addonCredits:   number;

  /**
   * planLimit + addonCredits — the true cap the UI should display and enforce.
   * Use this everywhere instead of planLimit.
   */
  effectiveLimit: number;

  /**
   * Distinct prompts attempted for this task.
   * Always 0 when taskNumber is null.
   */
  used:           number;

  /**
   * Math.max(0, effectiveLimit - used).
   * Always 0 when taskNumber is null.
   */
  remaining:      number;

  /**
   * True when used >= effectiveLimit — the user has exhausted both plan quota
   * AND any add-on credits.  In this state they can still practice but it
   * counts as a "bonus retry" (no quota charge, prompt stays fixed).
   * Always false when taskNumber is null.
   */
  isBonusRetry:   boolean;

  /** True while quota data is loading from the server. */
  isLoading:      boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the resolved quota state for a single writing task.
 *
 * @param taskNumber  The writing task number (1 or 2), or null for plan-level
 *                    overview (used / remaining / isBonusRetry will be 0 / 0 / false).
 */
export function useWritingQuota(taskNumber: number | null): WritingTaskQuotaResult {
  const { user }    = useCurrentUser();
  const quotaResult = useQuota("writing");

  const plan: UserPlan = user?.plan ?? "starter";

  // ── Step 1: Plan baseline limit ─────────────────────────────────────────────
  const planLimit: number =
    plan === "pro"
      ? PRO_PLAN_LIMITS.writing_attempts_per_task
      : STARTER_PLAN_LIMITS.writing_attempts_per_task;

  // ── Step 2: Add-on credits for this specific task ──────────────────────────
  // writing_pack    → webhook creates one AddonCredit row per task (task 1–2).
  //                   Both tasks automatically get credits when a pack is bought.
  // custom_bundle   → only the targeted task gets credits.
  //
  // The backend exposes this via writing_addon_credits_per_task in the quota
  // response (a dict of task_number → available credits).
  const addonCredits: number =
    taskNumber !== null
      ? quotaResult.writing_addon_credits_per_task?.[taskNumber] ?? 0
      : 0;

  // ── Step 3: Effective limit ─────────────────────────────────────────────────
  const effectiveLimit = planLimit + addonCredits;

  // ── Step 4: Usage for this task ─────────────────────────────────────────────
  const used: number =
    taskNumber !== null
      ? (quotaResult.writing_used_per_task as Record<number, number> | undefined)
          ?.[taskNumber] ?? 0
      : 0;

  // ── Step 5: Derived fields ──────────────────────────────────────────────────
  const remaining    = Math.max(0, effectiveLimit - used);
  const isBonusRetry = taskNumber !== null && used >= effectiveLimit;

  return {
    plan,
    planLimit,
    addonCredits,
    effectiveLimit,
    used,
    remaining,
    isBonusRetry,
    isLoading: quotaResult.isLoading,
  };
}
