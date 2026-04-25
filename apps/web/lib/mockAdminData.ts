// ─────────────────────────────────────────────────────────────────────────────
// lib/mockAdminData.ts — Mock data for admin prompt tables
//
// Separate from mockData.ts (which contains user-facing mock data) so that
// admin mock data can be tree-shaken out of the user-facing bundle.
// ─────────────────────────────────────────────────────────────────────────────

import type { SpeakingPrompt, WritingPrompt } from "./types";

// ── Mock Speaking Prompts ─────────────────────────────────────────────────────

export const MOCK_SPEAKING_PROMPTS: SpeakingPrompt[] = [
  {
    id:                   "sp-001",
    task_number:          1,
    title:                "Giving Advice",
    prep_time_seconds:    30,
    response_time_seconds: 90,
    prompt_text:
      "Your friend recently moved to Canada and is struggling to make new friends. " +
      "What advice would you give them?",
    difficulty:  "medium",
    is_active:   true,
    created_at:  "2026-03-01T00:00:00Z",
  },
  {
    id:                   "sp-002",
    task_number:          2,
    title:                "Talking about a Personal Experience",
    prep_time_seconds:    30,
    response_time_seconds: 60,
    prompt_text:
      "Tell me about a time when you had to learn something new very quickly.",
    difficulty:  "easy",
    is_active:   true,
    created_at:  "2026-03-02T00:00:00Z",
  },
  {
    id:                   "sp-003",
    task_number:          3,
    title:                "Describing a Scene",
    prep_time_seconds:    30,
    response_time_seconds: 60,
    prompt_text:
      "[Image prompt] Look at the image. Describe what you see in as much detail as possible.",
    difficulty:  "medium",
    is_active:   true,
    created_at:  "2026-03-03T00:00:00Z",
  },
  {
    id:                   "sp-004",
    task_number:          5,
    title:                "Comparing and Persuading",
    prep_time_seconds:    60,
    response_time_seconds: 60,
    prompt_text:
      "Part 1: Compare the two images. State your preference and give reasons.\n" +
      "Part 2: Now convince your friend to choose the other option.",
    difficulty:  "hard",
    is_active:   false,
    created_at:  "2026-03-04T00:00:00Z",
  },
];

// ── Mock Writing Prompts ──────────────────────────────────────────────────────

export const MOCK_WRITING_PROMPTS: WritingPrompt[] = [
  {
    id:                  "wp-001",
    task_number:         1,
    title:               "Writing an Email — Laptop Complaint",
    prompt_text:
      "You bought a laptop from a store but it stopped working after two weeks. " +
      "Write an email to the store manager describing the problem and requesting a refund.",
    task_type:           "email",
    difficulty:          "medium",
    time_limit_seconds:  27 * 60,
    min_words:           150,
    max_words:           200,
    is_active:           true,
    created_at:          "2026-03-01T00:00:00Z",
  },
  {
    id:                  "wp-002",
    task_number:         2,
    title:               "Opinion Essay — Remote Work",
    prompt_text:
      "Some people think working from home is better than working in an office. " +
      "Do you think working from home is a positive or negative development? " +
      "Use specific reasons and examples to support your opinion.",
    task_type:           "essay",
    difficulty:          "hard",
    time_limit_seconds:  26 * 60,
    min_words:           150,
    max_words:           200,
    is_active:           true,
    created_at:          "2026-03-02T00:00:00Z",
  },
];
