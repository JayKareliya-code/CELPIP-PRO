// ─────────────────────────────────────────────────────────────────────────────
// Application Constants — CELPIP WebTool
// ─────────────────────────────────────────────────────────────────────────────

// ── Routes ────────────────────────────────────────────────────────────────────

export const ROUTES = {
  home:             "/",
  signIn:           "/sign-in",
  signUp:           "/sign-up",
  dashboard:        "/dashboard",
  speaking:         "/speaking",
  writing:          "/writing",
  history:          "/history",
  progress:         "/progress",
  billing:          "/billing",
  admin:            "/admin",
  adminPrompts:     "/admin/prompts",
  adminCalibration: "/admin/calibration",
  adminMaterials:   "/admin/materials",
  adminAssets:      "/admin/assets",
  adminTags:        "/admin/tags",
  adminAudit:       "/admin/audit",
  adminCostReport:  "/admin/cost-report",
} as const;

// ── Speaking Task Timings (seconds) ───────────────────────────────────────────

export const SPEAKING_TASK_CONFIG = {
  practice: { prep: 30,  response: 60  },
  1:        { prep: 30,  response: 90  },
  2:        { prep: 30,  response: 60  },
  3:        { prep: 30,  response: 60  },
  4:        { prep: 30,  response: 60  },
  5:        { prep: 60,  response: 60  },  // Part 1 + Part 2 (60s each)
  6:        { prep: 30,  response: 60  },
  7:        { prep: 30,  response: 90  },
  8:        { prep: 30,  response: 60  },
} as const;

/**
 * Task numbers that require a context scene image.
 * Single source of truth — import this instead of redeclaring `new Set([3, 4, 8])`
 * in every component that needs it.
 */
export const IMAGE_TASK_NUMBERS: ReadonlySet<number> = new Set([3, 4, 8]);

// ── Writing Task Timings (seconds) ────────────────────────────────────────────

export const WRITING_TASK_CONFIG = {
  1: { timeLimit: 27 * 60, minWords: 150, maxWords: 200 },  // 27 minutes
  2: { timeLimit: 26 * 60, minWords: 150, maxWords: 200 },  // 26 minutes
} as const;

// ── Plan Pricing (CAD) — single source of truth ───────────────────────────────
// To update prices: change values HERE only. All UI components read from this.

export const PLAN_PRICING = {
  starter: {
    id:         "starter",
    name:       "Starter",
    price:      0,          // free
    priceLabel: "Free",
    priceNote:  "No credit card · Always free",
  },
  pro: {
    id:         "pro",
    name:       "Pro",
    price:      49.99,         // CAD
    priceLabel: "$49.99",
    priceNote:  "One-time · No subscription",
  },
  ultra: {
    id:         "ultra",
    name:       "Ultra",
    price:      99.99,         // CAD
    priceLabel: "$99.99",
    priceNote:  "One-time · No subscription",
  },
} as const;

/** Lowest paid plan price — used in marketing copy (e.g. "plans from $X CAD") */
export const STARTING_PRICE_CAD = PLAN_PRICING.pro.price; 

// ── Starter Plan (Free) Quotas ──────────────────────────────────────────────

export const STARTER_PLAN_LIMITS = {
  speaking_mock_tests:  1,  // 1 full speaking mock test
  writing_mock_tests:   1,  // 1 full writing mock test
  task_practice:        false, // individual task practice locked
  detailed_feedback:    false, // only basic estimated band
} as const;

// ── Score Booster Pro Plan Quotas ────────────────────────────────────────────

export const PRO_PLAN_LIMITS = {
  speaking_attempts_per_task: 5,  // Tasks 1–8 × 5 each
  writing_attempts_per_task:  5,  // Tasks 1–2 × 5 each
  speaking_mock_tests:        2,
  writing_mock_tests:         2,
  detailed_feedback:          true,
  improved_samples:           true,
  history_tracking:           true,
} as const;

// ── Band Achiever Ultra Plan Quotas ──────────────────────────────────────────

export const ULTRA_PLAN_LIMITS = {
  speaking_attempts_per_task: 15, // Tasks 1–8 × 15 each
  writing_attempts_per_task:  15, // Tasks 1–2 × 15 each
  speaking_mock_tests:        5,
  writing_mock_tests:         5,
  detailed_feedback:          true,
  advanced_rewriting:         true,
  multiple_samples:           true,
  analytics:                  true,
  weak_area_detection:        true,
  personalized_suggestions:   true,
} as const;

// ── Legacy aliases (kept for backward-compat during migration) ───────────────
/** @deprecated Use STARTER_PLAN_LIMITS */
export const FREE_PLAN_LIMITS = STARTER_PLAN_LIMITS;
/** @deprecated Use PRO_PLAN_LIMITS */
export const PREMIUM_PLAN_LIMITS = PRO_PLAN_LIMITS;

// ── Timer Warning Thresholds ──────────────────────────────────────────────────

/** Seconds remaining when timer turns yellow */
export const TIMER_WARNING_THRESHOLD_SECS = 5 * 60; // 5 minutes

/** Seconds remaining when timer turns red */
export const TIMER_DANGER_THRESHOLD_SECS = 60;       // 1 minute

/** Seconds remaining when response timer pulses for speaking */
export const RESPONSE_PULSE_THRESHOLD_SECS = 10;

// ── Polling Intervals ─────────────────────────────────────────────────────────

/** How often to poll attempt status page (ms) */
export const ATTEMPT_POLL_INTERVAL_MS = 3_000;

// ── Countdown Overlay ─────────────────────────────────────────────────────────

/** Steps shown in the countdown overlay before practice starts */
export const COUNTDOWN_STEPS = [3, 2, 1, "GO!"] as const;

/** Duration each countdown step is shown (ms) */
export const COUNTDOWN_STEP_DURATION_MS = 800;

// ── CELPIP Band Score ─────────────────────────────────────────────────────────

export const BAND_MIN = 1;
export const BAND_MAX = 12;

export const BAND_LABELS: Record<number, string> = {
  12: "Expert",
  11: "Advanced",
  10: "Advanced",
  9:  "Competent",
  8:  "Competent",
  7:  "Adequate",
  6:  "Developing",
  5:  "Developing",
  4:  "Limited",
  3:  "Limited",
  2:  "Weak",
  1:  "Very Weak",
};

// ── Speaking Task Names ────────────────────────────────────────────────────────

export const SPEAKING_TASK_NAMES: Record<string, string> = {
  practice: "Practice Task",
  "task-1":  "Task 1 — Giving Advice",
  "task-2":  "Task 2 — Talking about a Personal Experience",
  "task-3":  "Task 3 — Describing a Scene",
  "task-4":  "Task 4 — Making Predictions",
  "task-5":  "Task 5 — Comparing and Persuading",
  "task-6":  "Task 6 — Dealing with a Difficult Situation",
  "task-7":  "Task 7 — Expressing Opinions",
  "task-8":  "Task 8 — Describing an Unusual Situation",
};
