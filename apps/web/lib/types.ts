// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types — CELPIP WebTool
// ─────────────────────────────────────────────────────────────────────────────

// ── Skill / Module ───────────────────────────────────────────────────────────

export type Skill = "speaking" | "writing";

export type Difficulty = "easy" | "medium" | "hard";

export type AttemptStatus = "pending" | "processing" | "complete" | "failed" | "cancelled";

export type UserPlan = "starter" | "pro" | "ultra";

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
  speaking_limit_per_task: number | null;   // null = unlimited (ultra bypass)
  writing_limit_per_task:  number | null;
  can_attempt_speaking: Record<number, boolean>;
  can_attempt_writing:  Record<number, boolean>;
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

/** Per-rubric-dimension score returned by GET /attempts/{id}/report */
export interface ReportDimensionScore {
  dimension:  string;   // snake_case: "task_completion", "coherence", etc.
  label:      string;   // "Task Completion", "Coherence & Cohesion", etc.
  score:      number;   // 1–12
  max_score:  number;   // always 12
}

/** Full report returned by GET /api/v1/attempts/{id}/report */
export interface ReportResponse {
  attempt_id:       string;
  skill:            Skill;
  task_title:       string;
  estimated_band:   number;
  dimensions:       ReportDimensionScore[];
  strengths:        string[];
  weaknesses:       string[];
  improvement_tips: string[];
  sample_response:  string;
  transcript:       string | null;   // speaking only
  completed_at:     string;          // ISO 8601
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
