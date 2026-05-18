// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types — CELPIP WebTool
// ─────────────────────────────────────────────────────────────────────────────

// ── Skill / Module ───────────────────────────────────────────────────────────

export type Skill = "speaking" | "writing";

export type Difficulty = "easy" | "medium" | "hard";

export type AttemptStatus = "pending" | "processing" | "complete" | "failed" | "cancelled";

export type UserPlan = "starter" | "pro";

// ── Speaking ─────────────────────────────────────────────────────────────────

// ── Task 5 — Comparing & Persuading ─────────────────────────────────────────

/** A single detail row inside a Task 5 option card (e.g. "Tuition cost: $20,000") */
export interface ChoiceOptionDetail {
  label: string;  // e.g. "Tuition cost"
  value: string;  // e.g. "$20,000"
}

/** One option card — used for the two initial choices AND the curveball third option */
export interface ChoiceOption {
  name:       string;               // e.g. "Hairdressing"
  image_url?: string | null;        // optional card image (stored S3 URL)
  details:    ChoiceOptionDetail[]; // detail rows shown in the card
}

export interface SpeakingTask {
  id: string;
  /**
   * task_number is always a number (0–8) from the backend.
   * task_number === 0 is the "Practice" task — display as "Practice" in the UI.
   */
  task_number: number;
  title: string;
  prep_time_seconds: number;
  response_time_seconds: number;
  prompt_text: string;
  difficulty: Difficulty;
  vocabulary_tips: string[];
  connector_phrases?: string[];
  template_hint?: string;
  /** Task 5 has two parts — special state machine */
  has_parts?: boolean;
  part_count?: number;
  /**
   * Image-based tasks (3 — Describing a Scene, 4 — Making Predictions,
   * 8 — Unusual Situation). Tasks 3 & 4 share the same image; Task 8 uses
   * a different image per prompt. URL served from backend/S3.
   */
  context_image_url?: string | null;
  // ── Task 5 — Comparing & Persuading ──────────────────────────────────────
  /** The two initial option cards shown during the PREP (selection) phase. */
  choice_options?:            ChoiceOption[];
  /** The surprise curveball third option revealed at the RECORDING (prep) phase. */
  curveball_option?:          ChoiceOption;
  /** Instruction banner text on the curveball screen (Step 2 prompt). */
  curveball_instruction_text?: string | null;
  /**
   * Prompt pool tag.
   * "practice" (default) — used in individual task practice attempts.
   * "mock" — used in full mock exam sessions only.
   */
  prompt_tag?: "practice" | "mock";
}

// ── Mock Exam ─────────────────────────────────────────────────────────────────

/**
 * Admin-curated prompt for use in a full mock exam.
 * Separate content type from SpeakingTask (individual practice).
 * Fetched from GET /api/v1/mock-exam/prompts
 */
export interface MockExamPrompt extends SpeakingTask {
  /** Always 1–8 in a mock exam (no task_number 0 practice task). */
  task_number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

/** One task slot in a running mock exam session. */
export interface MockExamTask {
  taskNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  prompt: MockExamPrompt;
  /** Set after the task audio upload completes. */
  attemptId: string | null;
  /** Populated by the backend after AI scoring completes. */
  estimatedBand: number | null;
  status: "pending" | "active" | "uploading" | "done" | "error";
}

// ── Writing ──────────────────────────────────────────────────────────────────

export interface WritingTask {
  id: string;
  task_number: 1 | 2;
  title: string;
  task_type: string;              // e.g. "Email Format", "Opinion Essay"
  time_limit_seconds: number;
  min_words: number;
  max_words: number | null;       // null means no upper word limit (e.g. Task 2)
  prompt_text: string;
  idea_hints?: string[];
  intro_template?: string;
  conclusion_template?: string;
}

// ── User / Auth ──────────────────────────────────────────────────────────────

/** Returned by GET /api/v1/users/me */
export interface AppUser {
  id: string;
  clerk_id: string;
  full_name: string;
  email: string;
  plan: UserPlan;
  role: "user" | "admin";
  streak_days: number;
  last_active_date: string | null;  // ISO 8601; null on first login
  target_band: number | null;       // 1–12; null until user sets it
  tos_accepted_at?: string | null;  // ISO 8601; null until user accepts current T&C
  tos_version?:     string | null;
}

/** Returned by GET /api/v1/users/me/quota */
export interface QuotaStatusResponse {
  plan: UserPlan;
  speaking_used_per_task: Record<number, number>;
  writing_used_per_task:  Record<number, number>;
  speaking_limit_per_task: number | null;   // null = unlimited
  writing_limit_per_task:  number | null;
  can_attempt_speaking: Record<number, boolean>;
  can_attempt_writing:  Record<number, boolean>;
  /**
   * Purchased addon credits remaining per task.
   * speaking_pack expands to all 8 tasks at webhook time; custom_bundle
   * is task-specific. Frontend adds this to planLimit for effectiveLimit.
   */
  speaking_addon_credits_per_task: Record<number, number>;
  writing_addon_credits_per_task:  Record<number, number>;
  // ── Mock exam counts + limits + addon pool ─────────────────────────────────
  speaking_mock_tests_used:        number;
  writing_mock_tests_used:         number;
  speaking_mock_tests_limit:       number | null;
  writing_mock_tests_limit:        number | null;
  speaking_mock_addon_credits:     number;
  writing_mock_addon_credits:      number;
  // ── Retry credit pool ─────────────────────────────────────────────────────
  // Single shared pool spent on practice redoes (1 credit each) and mock
  // retakes (8 speaking / 2 writing). Free plan = 0, Pro granted at activation,
  // add-ons top up. `lifetime_granted` is the sum of every positive grant
  // (Pro activation + every add-on purchase) — used by the UI as the
  // denominator of the "remaining / total" progress bar.
  retry_credits_balance:          number;
  retry_credits_lifetime_granted: number;
}

/** One task's credit balance — from GET /api/v1/billing/addon-credits */
export interface TaskCreditStat {
  /** Remaining unconsumed credits for this task. */
  available: number;
  /** Total credits ever purchased for this task (excluding refunds). */
  purchased: number;
}

/** Aggregate mock test bundle credit balance (not task-specific). */
export interface MockCreditStat {
  available: number;
  purchased: number;
}

/**
 * Per-skill, per-task addon credit inventory plus mock bundle balances.
 * Returned by GET /api/v1/billing/addon-credits.
 *
 * Keys are task_number integers; missing tasks have no credits.
 * Includes both active and exhausted rows so progress bars work even
 * when a pack is fully consumed.
 */
export interface AddonCreditSummary {
  speaking: Record<number, TaskCreditStat>;
  writing:  Record<number, TaskCreditStat>;
  /** Mock bundle credits: { speaking: {...}, writing: {...} } — omitted if none purchased. */
  mock?:    Record<string, MockCreditStat>;
}

// ── Attempts ─────────────────────────────────────────────────────────────────

/**
 * Returned by GET /api/v1/attempts/{id}/status.
 * Phase 2 fields (estimated_band, audio_url, transcript, feedback) will be
 * added to the backend scoring report endpoint. Keep them optional here.
 */
export interface AttemptStatusResponse {
  attempt_id:       string;     // UUID
  status:           AttemptStatus;
  skill:            Skill;
  celery_task_id:   string | null;
  error_message:    string | null;
  report_available: boolean;
  created_at:       string;     // ISO 8601
  updated_at:       string;     // ISO 8601
  // Phase 2 additions (will be null/undefined until scoring completes):
  estimated_band?: number | null;
  audio_url?:      string;
  transcript?:     string;
  feedback?:       AttemptFeedback;
}

/**
 * Legacy Attempt type — used by history and mock data.
 * @deprecated Prefer AttemptStatusResponse for new code.
 */
export interface Attempt {
  id: string;
  user_id: string;
  skill: Skill;
  task_id: string;
  task_title: string;
  status: AttemptStatus;
  created_at: string;
  completed_at?: string;
  estimated_band?: number | null;
  audio_url?: string;
  transcript?: string;
  feedback?: AttemptFeedback;
}

export interface AttemptFeedback {
  overall_band: number;
  dimensions: DimensionScore[];
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface DimensionScore {
  label: string;    // e.g. "Vocabulary Range"
  score: number;    // 1–12
  comment?: string;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

/**
 * Lifecycle status for any admin-managed content item.
 * draft      → being created, not yet visible to users.
 * published  → live and accessible per access rules.
 * archived   → hidden from users, preserved in DB, cannot be newly assigned.
 */
export type ContentStatus = "draft" | "published" | "archived";

export interface SpeakingPrompt {
  id: string;
  task_number: number;
  title: string;
  prep_time_seconds: number;
  response_time_seconds: number;
  prompt_text: string;
  is_active: boolean;
  difficulty: Difficulty;
  created_at: string;
  /** Task 5 has two recording parts. */
  has_parts?:   boolean;
  part_count?:  number;
  vocabulary_tips?:   string[];
  connector_phrases?: string[];
  template_hint?:     string | null;
  /**
   * Scene image URL — present for Tasks 3, 4, 8.
   * Tasks 3 & 4 share the same image per prompt set; Task 8 uses a unique image.
   */
  context_image_url?: string | null;
  // ── CMS admin fields (optional for backward-compat with legacy mock data) ──
  slug?:         string | null;
  topic?:        string | null;
  /** Instructions shown to the candidate above the prompt text. */
  instructions_text?: string | null;
  status?:       ContentStatus;
  sort_order?:   number;
  version_no?:   number;
  published_at?: string | null;  // ISO 8601
  archived_at?:  string | null;  // ISO 8601
  updated_at?:   string;
  // ── Task 5 — Comparing & Persuading ──────────────────────────────────────
  choice_options?:             ChoiceOption[] | null;
  curveball_option?:           ChoiceOption | null;
  curveball_instruction_text?: string | null;
  /** 0 = Option A, 1 = Option B — admin default selected choice for preview */
  default_choice_index?:       number | null;
}

export interface WritingPrompt {
  id: string;
  task_number: 1 | 2;
  title: string;
  prompt_text: string;
  task_type: string;
  min_words: number;
  max_words: number | null;
  time_limit_seconds: number;
  difficulty: "easy" | "medium" | "hard";
  is_active: boolean;
  created_at: string;
  // ── CMS admin fields (optional for backward-compat with legacy mock data) ──
  slug?:         string | null;
  topic?:        string | null;
  instructions_text?: string | null;
  status?:       ContentStatus;
  sort_order?:   number;
  version_no?:   number;
  published_at?: string | null;  // ISO 8601
  archived_at?:  string | null;  // ISO 8601
  updated_at?:   string;
}


export interface CalibrationSample {
  id: string;
  skill: Skill;
  task_number: number | null;
  band_level: number;           // renamed from band_score to match backend
  sample_text: string;          // renamed from content_url — backend stores text
  source: string;
  is_active: boolean;
  created_at: string;
}

// ── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

/** Matches backend PaginatedResponse schema (per_page field). */
export interface PaginatedResponse<T> {
  items:    T[];
  total:    number;
  page:     number;
  per_page: number;
  pages:    number;
}

// ── Phase 2: Report API ───────────────────────────────────────────────────────

/** A single strength or weakness returned by the AI scorer (new rich format) */
export interface ReportFeedbackItem {
  label:       string;   // Dimension name: "Vocabulary Range"
  observation: string;   // What was done well / what the gap is
  quote:       string;   // Verbatim excerpt from the transcript
  fix:         string;   // Weaknesses only: concrete action to fix it (empty string for strengths)
}

/** An actionable improvement tip with a drill and example (new rich format) */
export interface ReportImprovementTip {
  title:   string;   // Short label: "Reduce Filler Words"
  why:     string;   // Why this hurts the score
  how:     string;   // The practice drill / technique
  example: string;   // A concrete before/after phrase
}

/** Per-rubric-dimension score returned by GET /attempts/{id}/report */
export interface ReportDimensionScore {
  dimension:   string;   // snake_case: "task_completion", "coherence", etc.
  label:       string;   // "Task Completion", "Coherence & Cohesion", etc.
  score:       number;   // 1–12
  max_score:   number;   // always 12
  commentary:  string;   // One-sentence explanation of why this score was given
}

/**
 * Explicit gating signal from the API.
 *
 * `has_full_report` is the single source of truth for whether the UI should
 * render the full coaching report or locked overlays. The pro-only fields
 * (dimensions, strengths, …) are stripped server-side for starter users, so
 * they cannot be inspected via DevTools — this object just tells the UI
 * which sections to show as locked.
 *
 * Marked optional for forward/backwards compatibility during rolling deploys:
 * an older backend that hasn't shipped this field yet will look like
 * `access === undefined`, and the report page falls back to deriving access
 * from the user's plan.
 */
export interface ReportAccess {
  has_full_report: boolean;
  plan:            "starter" | "pro";
  locked_sections: string[];
}

/** Full report returned by GET /api/v1/attempts/{id}/report */
export interface ReportResponse {
  attempt_id:                 string;
  prompt_id:                  string;
  skill:                      Skill;
  task_number:                number;
  task_title:                 string;
  prompt_text:                string;
  instructions_text:          string | null;
  context_image_url:          string | null;
  // Task 5 — Comparing & Persuading
  choice_options:             ChoiceOption[] | null;
  curveball_option:           ChoiceOption | null;
  curveball_instruction_text: string | null;
  user_response_text:         string | null;
  estimated_band:             number;
  dimensions:                 ReportDimensionScore[];
  strengths:                  ReportFeedbackItem[];
  weaknesses:                 ReportFeedbackItem[];
  improvement_tips:           ReportImprovementTip[];
  sample_response:            string;
  transcript:                 string | null;
  next_milestone:             string;    // One-sentence next-step coaching note
  completed_at:               string;
  access?:                    ReportAccess;  // optional during rolling deploys
}

/**
 * One aggregated weak-area row returned by GET /api/v1/users/me/weak-areas.
 * Sorted ascending by avg_score (weakest first).
 */
export interface WeakAreaItem {
  dimension:     string;   // snake_case key, e.g. "fluency"
  label:         string;   // human-readable, e.g. "Fluency & Pronunciation"
  avg_score:     number;   // 1.0–12.0
  attempt_count: number;   // how many scored attempts contributed
}

// ── Phase 2: History API ──────────────────────────────────────────────────────

/** One attempt row in the paginated history list */
export interface HistoryItem {
  attempt_id:     string;
  skill:          Skill;
  task_number:    number;
  task_title:     string;
  is_mock_test:   boolean;
  status:         AttemptStatus;
  estimated_band: number | null;
  created_at:     string;
}

/** GET /api/v1/history response */
export interface PaginatedHistory {
  items:    HistoryItem[];
  total:    number;
  page:     number;
  limit:    number;
  has_next: boolean;
}

// ── P2: Task Score History ────────────────────────────────────────────────────

/** Per-dimension score within a historical score point */
export interface HistoryDimensionScore {
  dimension: string;  // snake_case key e.g. "coherence"
  score:     number;
  max_score: number;
}

/** One historical band score point for a skill+task_number */
export interface TaskScorePoint {
  attempt_id:     string;
  estimated_band: number;
  completed_at:   string;   // ISO 8601
  dimensions:     HistoryDimensionScore[];  // empty for legacy rows
}

/** Response from GET /api/v1/history/task-scores */
export interface TaskScoreHistory {
  skill:       string;
  task_number: number;
  scores:      TaskScorePoint[];  // ordered oldest → newest
}
