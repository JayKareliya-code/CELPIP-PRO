// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// lib/hooks/useAdminPrompts.ts
//
// React Query hooks for the Admin Prompt Management CMS.
//
// Cache invalidation strategy:
//   Mutations invalidate by BASE key only (no filter args) so React Query's
//   prefix matching catches every variant: [], [{}], [{status:"draft"}] etc.
//   ["adminSpeakingPrompts"] matches ["adminSpeakingPrompts", {}] âœ“
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

"use client";

import { useAuth }           from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast }             from "sonner";
import { api, API_V1, authHeaders, ApiError } from "@/lib/api";
import type { SpeakingPrompt, WritingPrompt, ChoiceOption } from "@/lib/types";

// â”€â”€ Query Keys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Base keys used for prefix-based invalidation â€” never include filter args here. */
const BASE_KEYS = {
  adminSpeaking: ["adminSpeakingPrompts"] as const,
  adminWriting:  ["adminWritingPrompts"]  as const,
  publicSpeaking: ["speakingTasks"]       as const,
  publicWriting:  ["writingTasks"]        as const,
} as const;

/**
 * Full query keys (base key + filters) used when registering a query.
 * Mutations always invalidate via BASE_KEYS so prefix matching catches all variants.
 */
export const QUERY_KEYS = {
  adminSpeaking: (filters?: Record<string, unknown>) =>
    [...BASE_KEYS.adminSpeaking, filters ?? {}] as const,
  adminWriting: (filters?: Record<string, unknown>) =>
    [...BASE_KEYS.adminWriting, filters ?? {}] as const,
  publicSpeaking: BASE_KEYS.publicSpeaking,
  publicWriting:  BASE_KEYS.publicWriting,
} as const;

// â”€â”€ Payload types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface SpeakingPromptPayload {
  task_number:             number;
  title:                   string;
  prompt_text:             string;
  slug?:                   string | null;
  topic?:                  string | null;
  instructions_text?:      string | null;
  context_image_url?:      string | null;
  prep_time_seconds:       number;
  response_time_seconds:   number;
  difficulty:              "easy" | "medium" | "hard";
  has_parts?:              boolean;
  part_count?:             number;
  vocabulary_tips?:        string[];
  connector_phrases?:      string[];
  template_hint?:          string | null;
  sample_response_band12?: string | null;
  sort_order?:             number;
  is_active?:              boolean;
  status?:                 "draft" | "published" | "archived";
  // â”€â”€ Task 5 â€” Comparing & Persuading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /** The two initial option cards shown during the PREP (selection) phase. */
  choice_options?:             ChoiceOption[] | null;
  /** The surprise curveball third option revealed at RECORDING phase. */
  curveball_option?:           ChoiceOption | null;
  /** Instruction banner text shown on the curveball screen. */
  curveball_instruction_text?: string | null;
  /** 0 = Option A, 1 = Option B â€” admin preview default / scoring reference. */
  default_choice_index?:       number | null;
  /**
   * Prompt pool tag. "practice" (default) = individual task attempts only.
   * "mock" = full mock exam sessions only.
   */
  prompt_tag?:                 "practice" | "mock";
}

export interface WritingPromptPayload {
  task_number:               number;
  title:                     string;
  prompt_text:               string;
  task_type:                 string;
  slug?:                     string | null;
  topic?:                    string | null;
  instructions_text?:        string | null;
  min_words:                 number;
  max_words?:                number | null;
  time_limit_seconds:        number;
  difficulty:                "easy" | "medium" | "hard";
  idea_hints?:               string[];
  intro_template?:           string | null;
  conclusion_template?:      string | null;
  sample_response_band12?:   string | null;
  sort_order?:               number;
  is_active?:                boolean;
  status?:                   "draft" | "published" | "archived";
  prompt_tag?:               "practice" | "mock";
}

// â”€â”€ Internal helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function useAdminToken() {
  const { getToken, isSignedIn } = useAuth();
  const getHeaders = async () => {
    const t = await getToken();
    if (!t) throw new Error("Not authenticated");
    return authHeaders(t);
  };
  return { getHeaders, isSignedIn: !!isSignedIn };
}

function handleMutationError(err: unknown, fallback: string) {
  const msg = err instanceof ApiError ? err.message : fallback;
  toast.error(msg);
}

/** Invalidate by base key â€” matches ALL filter variants via prefix matching. */
function invalidateSpeaking(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: BASE_KEYS.adminSpeaking });
}
function invalidateWriting(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: BASE_KEYS.adminWriting });
}
function invalidatePublicSpeaking(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: BASE_KEYS.publicSpeaking });
}
function invalidatePublicWriting(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: BASE_KEYS.publicWriting });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SPEAKING HOOKS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface SpeakingListFilters {
  status?:      string;
  task_number?: number;
  search?:      string;
  limit?:       number;
  offset?:      number;
  [key: string]: unknown;
}

/** Fetch all speaking prompts for the admin CMS table. */
export function useAdminSpeakingPrompts(filters: SpeakingListFilters = {}) {
  const { getHeaders, isSignedIn } = useAdminToken();
  return useQuery<SpeakingPrompt[]>({
    queryKey: QUERY_KEYS.adminSpeaking(filters),
    queryFn: async () => {
      const headers = await getHeaders();
      const params  = new URLSearchParams();
      if (filters.status)              params.set("status",      filters.status);
      if (filters.task_number != null) params.set("task_number", String(filters.task_number));
      if (filters.search)              params.set("search",      filters.search);
      if (filters.limit)               params.set("limit",       String(filters.limit));
      if (filters.offset)              params.set("offset",      String(filters.offset));
      const qs = params.toString() ? `?${params}` : "";
      return api.get<SpeakingPrompt[]>(`${API_V1}/admin/speaking-prompts${qs}`, { headers });
    },
    enabled:              isSignedIn,   // don't fire until Clerk confirms the session
    staleTime:            0,            // always refetch after mutation invalidation
    retry:                1,            // fail fast — don't cascade retries on hot reload
    refetchOnWindowFocus: false,        // prevent refetch on tab switch / hot reload focus
  });
}

export function useCreateSpeakingPrompt() {
  const qc         = useQueryClient();
  const { getHeaders } = useAdminToken();
  return useMutation<SpeakingPrompt, Error, SpeakingPromptPayload>({
    mutationFn: async (payload) => {
      const headers = await getHeaders();
      return api.post<SpeakingPrompt>(`${API_V1}/admin/speaking-prompts`, payload, { headers });
    },
    onSuccess: () => {
      invalidateSpeaking(qc);
      toast.success("Speaking prompt created.");
    },
    onError: (err) => handleMutationError(err, "Failed to create prompt."),
  });
}

export function useUpdateSpeakingPrompt() {
  const qc         = useQueryClient();
  const { getHeaders } = useAdminToken();
  return useMutation<SpeakingPrompt, Error, { id: string; payload: SpeakingPromptPayload }>({
    mutationFn: async ({ id, payload }) => {
      const headers = await getHeaders();
      return api.patch<SpeakingPrompt>(`${API_V1}/admin/speaking-prompts/${id}`, payload, { headers });
    },
    onSuccess: () => {
      invalidateSpeaking(qc);
      invalidatePublicSpeaking(qc);
      toast.success("Prompt updated.");
    },
    onError: (err) => handleMutationError(err, "Failed to update prompt."),
  });
}

export function useDeleteSpeakingPrompt() {
  const qc         = useQueryClient();
  const { getHeaders } = useAdminToken();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const headers = await getHeaders();
      return api.delete<void>(`${API_V1}/admin/speaking-prompts/${id}`, { headers });
    },
    onSuccess: () => {
      invalidateSpeaking(qc);
      invalidatePublicSpeaking(qc);
      toast.success("Prompt deleted.");
    },
    onError: (err) => handleMutationError(err, "Failed to delete prompt."),
  });
}

export function usePublishSpeakingPrompt() {
  const qc         = useQueryClient();
  const { getHeaders } = useAdminToken();
  return useMutation<{ status: string }, Error, string>({
    mutationFn: async (id) => {
      const headers = await getHeaders();
      return api.post<{ status: string }>(`${API_V1}/admin/speaking-prompts/${id}/publish`, {}, { headers });
    },
    onSuccess: () => {
      invalidateSpeaking(qc);
      invalidatePublicSpeaking(qc);
      toast.success("Prompt published â€” now visible to candidates.");
    },
    onError: (err) => handleMutationError(err, "Failed to publish prompt."),
  });
}

export function useArchiveSpeakingPrompt() {
  const qc         = useQueryClient();
  const { getHeaders } = useAdminToken();
  return useMutation<{ status: string }, Error, string>({
    mutationFn: async (id) => {
      const headers = await getHeaders();
      return api.post<{ status: string }>(`${API_V1}/admin/speaking-prompts/${id}/archive`, {}, { headers });
    },
    onSuccess: () => {
      invalidateSpeaking(qc);
      invalidatePublicSpeaking(qc);
      toast.success("Prompt archived.");
    },
    onError: (err) => handleMutationError(err, "Failed to archive prompt."),
  });
}

/**
 * Toggle is_active for a speaking prompt.
 *
 * Uses a dedicated /toggle-active endpoint instead of the full PATCH so only
 * the is_active boolean is written â€” no risk of corrupting context_image_url,
 * status, or any other field with stale payload values.
 */
export function useToggleActiveSpeakingPrompt() {
  const qc         = useQueryClient();
  const { getHeaders } = useAdminToken();
  return useMutation<{ id: string; is_active: boolean }, Error, string>({
    mutationFn: async (id) => {
      const headers = await getHeaders();
      return api.post<{ id: string; is_active: boolean }>(
        `${API_V1}/admin/speaking-prompts/${id}/toggle-active`,
        {},
        { headers },
      );
    },
    onSuccess: () => {
      invalidateSpeaking(qc);
      invalidatePublicSpeaking(qc);
    },
    onError: (err) => handleMutationError(err, "Failed to toggle prompt active state."),
  });
}



// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// WRITING HOOKS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface WritingListFilters {
  status?:      string;
  task_number?: number;
  search?:      string;
  limit?:       number;
  offset?:      number;
  [key: string]: unknown;
}

export function useAdminWritingPrompts(filters: WritingListFilters = {}) {
  const { getHeaders, isSignedIn } = useAdminToken();
  return useQuery<WritingPrompt[]>({
    queryKey: QUERY_KEYS.adminWriting(filters),
    queryFn: async () => {
      const headers = await getHeaders();
      const params  = new URLSearchParams();
      if (filters.status)              params.set("status",      filters.status);
      if (filters.task_number != null) params.set("task_number", String(filters.task_number));
      if (filters.search)              params.set("search",      filters.search);
      if (filters.limit)               params.set("limit",       String(filters.limit));
      if (filters.offset)              params.set("offset",      String(filters.offset));
      const qs = params.toString() ? `?${params}` : "";
      return api.get<WritingPrompt[]>(`${API_V1}/admin/writing-prompts${qs}`, { headers });
    },
    enabled:              isSignedIn,
    staleTime:            0,          // always refetch after mutation invalidation
    retry:                1,
    refetchOnWindowFocus: false,
  });
}

export function useCreateWritingPrompt() {
  const qc         = useQueryClient();
  const { getHeaders } = useAdminToken();
  return useMutation<WritingPrompt, Error, WritingPromptPayload>({
    mutationFn: async (payload) => {
      const headers = await getHeaders();
      return api.post<WritingPrompt>(`${API_V1}/admin/writing-prompts`, payload, { headers });
    },
    onSuccess: () => {
      invalidateWriting(qc);
      toast.success("Writing prompt created.");
    },
    onError: (err) => handleMutationError(err, "Failed to create prompt."),
  });
}

export function useUpdateWritingPrompt() {
  const qc         = useQueryClient();
  const { getHeaders } = useAdminToken();
  return useMutation<WritingPrompt, Error, { id: string; payload: WritingPromptPayload }>({
    mutationFn: async ({ id, payload }) => {
      const headers = await getHeaders();
      return api.patch<WritingPrompt>(`${API_V1}/admin/writing-prompts/${id}`, payload, { headers });
    },
    onSuccess: () => {
      invalidateWriting(qc);
      invalidatePublicWriting(qc);
      toast.success("Prompt updated.");
    },
    onError: (err) => handleMutationError(err, "Failed to update prompt."),
  });
}

export function useDeleteWritingPrompt() {
  const qc         = useQueryClient();
  const { getHeaders } = useAdminToken();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const headers = await getHeaders();
      return api.delete<void>(`${API_V1}/admin/writing-prompts/${id}`, { headers });
    },
    onSuccess: () => {
      invalidateWriting(qc);
      invalidatePublicWriting(qc);
      toast.success("Prompt deleted.");
    },
    onError: (err) => handleMutationError(err, "Failed to delete prompt."),
  });
}

export function usePublishWritingPrompt() {
  const qc         = useQueryClient();
  const { getHeaders } = useAdminToken();
  return useMutation<{ status: string }, Error, string>({
    mutationFn: async (id) => {
      const headers = await getHeaders();
      return api.post<{ status: string }>(`${API_V1}/admin/writing-prompts/${id}/publish`, {}, { headers });
    },
    onSuccess: () => {
      invalidateWriting(qc);
      invalidatePublicWriting(qc);
      toast.success("Prompt published â€” now visible to candidates.");
    },
    onError: (err) => handleMutationError(err, "Failed to publish prompt."),
  });
}

export function useArchiveWritingPrompt() {
  const qc         = useQueryClient();
  const { getHeaders } = useAdminToken();
  return useMutation<{ status: string }, Error, string>({
    mutationFn: async (id) => {
      const headers = await getHeaders();
      return api.post<{ status: string }>(`${API_V1}/admin/writing-prompts/${id}/archive`, {}, { headers });
    },
    onSuccess: () => {
      invalidateWriting(qc);
      invalidatePublicWriting(qc);
      toast.success("Prompt archived.");
    },
    onError: (err) => handleMutationError(err, "Failed to archive prompt."),
  });
}

/**
 * Toggle is_active for a writing prompt.
 * Uses a dedicated /toggle-active endpoint — mirrors the speaking equivalent.
 */
export function useToggleActiveWritingPrompt() {
  const qc         = useQueryClient();
  const { getHeaders } = useAdminToken();
  return useMutation<{ id: string; is_active: boolean }, Error, string>({
    mutationFn: async (id) => {
      const headers = await getHeaders();
      return api.post<{ id: string; is_active: boolean }>(
        `${API_V1}/admin/writing-prompts/${id}/toggle-active`,
        {},
        { headers },
      );
    },
    onSuccess: () => {
      invalidateWriting(qc);
      invalidatePublicWriting(qc);
    },
    onError: (err) => handleMutationError(err, "Failed to toggle prompt active state."),
  });
}
