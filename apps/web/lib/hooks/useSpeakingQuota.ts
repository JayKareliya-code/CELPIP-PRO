// ─────────────────────────────────────────────────────────────────────────────
// lib/hooks/useSpeakingQuota.ts
//
// Centralised per-task speaking quota hook.
//
// Why this hook exists
// ─────────────────────
// The quota limit for a speaking task is:
//
//   effectiveLimit = planLimit + addonCredits
//
// where:
//   planLimit    = STARTER_PLAN_LIMITS / PRO_PLAN_LIMITS (from constants.ts)
//   addonCredits = purchased extra attempts from addon_credits table (backend)
//                  - speaking_pack purchase → credits added to ALL 8 tasks
//                  - custom_bundle (e.g. Task 4) → credits only for Task 4
//
// Without this hook the formula was copy-pasted across SpeakingModuleHome and
// TaskPromptsFolder — neither location accounted for add-on credits, making
// the displayed limit wrong the moment a user purchased a pack.
//
// Usage
// ─────
//   // Task-specific (TaskPromptsFolder, etc.)
//   const { effectiveLimit, used, remaining, isBonusRetry, isLoading } =
//     useSpeakingQuota(taskNumber);
//
//   // Plan-level overview (SpeakingModuleHome stats strip)
//   const { effectiveLimit, plan, isLoading } = useSpeakingQuota(null);
//   //  → used / remaining / isBonusRetry are 0 / 0 / false when taskNumber=null
//
// Scalability
// ────────────
// When the backend adds speaking_addon_credits_per_task to QuotaStatusResponse
// (already implemented), this hook picks it up automatically.  No component
// changes are ever needed to wire in future addon types.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useCurrentUser }           from "@/lib/hooks/useCurrentUser";
import { useQuota }                 from "@/lib/hooks/useQuota";
import { PRO_PLAN_LIMITS, STARTER_PLAN_LIMITS } from "@/lib/constants";
import type { UserPlan }            from "@/lib/types";

// ── Return type ───────────────────────────────────────────────────────────────

export interface TaskQuotaResult {
  /** The user's current plan. */
  plan:           UserPlan;

  /** Plan baseline quota (from constants — no add-ons). */
  planLimit:      number;

  /**
   * Purchased add-on credits available for this specific task.
   *
   * - speaking_pack purchase → credits added to all 8 speaking tasks
   *   (the webhook expands one pack purchase into 8 rows, one per task).
   * - custom_bundle for Task N → credits only for Task N.
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
   * Distinct prompts COMPLETED for this task (quota-consumed count).
   * Always 0 when taskNumber is null.
   */
  used:           number;

  /**
   * Math.max(0, effectiveLimit - used).
   * Always 0 when taskNumber is null.
   */
  remaining:      number;

  /** True while quota data is loading from the server. */
  isLoading:      boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the resolved quota state for a single speaking task.
 *
 * @param taskNumber  The speaking task number (0–8), or null for plan-level
 *                    overview (used / remaining / isBonusRetry will be 0 / 0 / false).
 */
export function useSpeakingQuota(taskNumber: number | null): TaskQuotaResult {
  const { user, isLoading: userLoading } = useCurrentUser();
  const quotaResult  = useQuota("speaking");

  const plan: UserPlan = user?.plan ?? "starter";

  // ── Step 1: Plan baseline limit ─────────────────────────────────────────────
  const planLimit: number =
    plan === "pro"
      ? PRO_PLAN_LIMITS.speaking_attempts_per_task
      : STARTER_PLAN_LIMITS.speaking_attempts_per_task;

  // ── Step 2: Add-on credits for this specific task ──────────────────────────
  // speaking_pack    → webhook creates one AddonCredit row per task (task 1–8).
  //                    All tasks automatically get credits when a pack is bought.
  // custom_bundle    → only the targeted task gets credits.
  //
  // The backend exposes this via speaking_addon_credits_per_task in the quota
  // response (a dict of task_number → available credits).
  const addonCredits: number =
    taskNumber !== null
      ? quotaResult.speaking_addon_credits_per_task?.[taskNumber] ?? 0
      : 0;

  // ── Step 3: Effective limit ─────────────────────────────────────────────────
  const effectiveLimit = planLimit + addonCredits;

  // ── Step 4: Usage for this task ─────────────────────────────────────────────
  const used: number =
    taskNumber !== null
      ? (quotaResult.speaking_used_per_task as Record<number, number> | undefined)
          ?.[taskNumber] ?? 0
      : 0;

  // ── Step 5: Derived fields ──────────────────────────────────────────────────
  const remaining = Math.max(0, effectiveLimit - used);

  return {
    plan,
    planLimit,
    addonCredits,
    effectiveLimit,
    used,
    remaining,
    isLoading: userLoading || quotaResult.isLoading,
  };
}
