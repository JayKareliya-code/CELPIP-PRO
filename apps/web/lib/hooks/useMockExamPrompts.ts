"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useMockExamPrompts — Fetches admin-curated mock exam prompts.
//
// Calls GET /api/v1/mock-exam/prompts
// Returns one MockExamPrompt per task (Tasks 1–8), in task order.
//
// In mock/dev mode (USE_MOCK=true): returns generated stub prompts built
// from SPEAKING_TASK_CONFIG so the UI is fully exercisable offline.
// ─────────────────────────────────────────────────────────────────────────────

import { useAuth }                from "@clerk/nextjs";
import { useQuery }               from "@tanstack/react-query";
import { API_V1, api, authHeaders, ApiError, USE_MOCK } from "@/lib/api";
import { MOCK_EXAM_TASK_NUMBERS }        from "@/lib/practice/config";
import { SPEAKING_TASK_CONFIG }          from "@/lib/constants";
import type { MockExamPrompt }           from "@/lib/types";

// ── Dev mock data ─────────────────────────────────────────────────────────────

const TASK_LABELS: Record<number, string> = {
  1: "Giving Advice",
  2: "Talking about a Personal Experience",
  3: "Describing a Scene",
  4: "Making Predictions",
  5: "Comparing and Persuading",
  6: "Dealing with a Difficult Situation",
  7: "Expressing Opinions",
  8: "Describing an Unusual Situation",
};

const MOCK_PROMPTS: Record<number, string> = {
  1: "Your friend is moving to a new city and doesn't know anyone there. They are feeling nervous about the move. What advice would you give them?",
  2: "Describe a time when you had to learn something new very quickly. What was it, and how did you learn it?",
  3: "Describe everything you see in this image in as much detail as possible.",
  4: "Look at the three images. What do you think will happen next? Make at least two predictions.",
  5: "Compare Option A and Option B. Which would you choose, and why? Then argue for the other option.",
  6: "You ordered a new laptop online but received the wrong model. Leave a voicemail for the company explaining the situation and what you need them to do.",
  7: "Some people believe that social media has made communication better. Others disagree. What is your opinion?",
  8: "Describe this unusual situation. What do you think led to this? What do you think will happen next?",
};

function buildMockPrompts(): MockExamPrompt[] {
  return MOCK_EXAM_TASK_NUMBERS.map((n) => {
    const taskKey = n as keyof typeof SPEAKING_TASK_CONFIG;
    const config  = SPEAKING_TASK_CONFIG[taskKey] ?? { prep: 30, response: 60 };
    return {
      id:                   `mock-exam-task-${n}`,
      task_number:          n,
      title:                `Task ${n} — ${TASK_LABELS[n]}`,
      prep_time_seconds:    config.prep,
      response_time_seconds: config.response,
      prompt_text:          MOCK_PROMPTS[n] ?? "Practice prompt.",
      difficulty:           "medium",
      vocabulary_tips:      [],
      connector_phrases:    [],
      has_parts:            n === 5,
    } as MockExamPrompt;
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseMockExamPromptsReturn {
  prompts:   MockExamPrompt[];
  isLoading: boolean;
  error:     Error | null;
}

export function useMockExamPrompts(slotNumber: number): UseMockExamPromptsReturn {
  const { getToken, userId } = useAuth();

  const { data, isLoading, error } = useQuery<MockExamPrompt[], Error>({
    // Scope by userId for consistency with the rest of the auth-protected
    // hooks. The prompts themselves are the same across users, but having
    // a uniform key shape keeps invalidation/clearing patterns symmetric.
    queryKey: ["mockExamPrompts", userId ?? "anonymous", slotNumber],

    queryFn: async (): Promise<MockExamPrompt[]> => {
      // ── Mock / dev mode ────────────────────────────────────────────────────
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 800)); // simulate network
        return buildMockPrompts();
      }

      // ── Real API ───────────────────────────────────────────────────────────
      // Backend GET /api/v1/mock-exam/prompts?slot=N returns list[SpeakingTaskResponse]
      const token = await getToken();
      return api.get<MockExamPrompt[]>(`${API_V1}/mock-exam/prompts?slot=${slotNumber}`, {
        headers: authHeaders(token),
      });
    },

    staleTime: 5 * 60 * 1000,  // prompts don't change during an exam session
    // Don't retry on 404 (slot has no prompts yet) — show coming-soon immediately.
    // Retry once for genuine network / 5xx failures.
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 1;
    },
  });

  return {
    prompts:   data ?? [],
    isLoading,
    error:     error ?? null,
  };
}
