"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_V1, authHeaders } from "@/lib/api";

export type PromptStatus = "draft" | "published" | "archived";

export interface CmsSpeakingPrompt {
  id: string;
  task_number: number;
  title: string;
  slug: string | null;
  status: PromptStatus;
  difficulty: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CmsWritingPrompt {
  id: string;
  task_number: number;
  title: string;
  slug: string | null;
  status: PromptStatus;
  difficulty: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useAdminSpeakingPrompts(filters?: {
  status?: string;
  task_number?: number;
  search?: string;
}) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "speaking-prompts", filters],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.task_number != null) params.set("task_number", String(filters.task_number));
      if (filters?.search) params.set("search", filters.search);
      const qs = params.toString() ? `?${params}` : "";
      return api.get<CmsSpeakingPrompt[]>(`${API_V1}/admin/speaking-prompts${qs}`, {
        headers: authHeaders(token),
      });
    },
  });
}

export function useAdminWritingPrompts(filters?: { status?: string; search?: string }) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "writing-prompts", filters],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.search) params.set("search", filters.search);
      const qs = params.toString() ? `?${params}` : "";
      return api.get<CmsWritingPrompt[]>(`${API_V1}/admin/writing-prompts${qs}`, {
        headers: authHeaders(token),
      });
    },
  });
}

export function usePublishPrompt(skill: "speaking" | "writing") {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.post(`${API_V1}/admin/${skill}-prompts/${id}/publish`, {}, {
        headers: authHeaders(token),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", `${skill}-prompts`] }),
  });
}

export function useArchivePrompt(skill: "speaking" | "writing") {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.post(`${API_V1}/admin/${skill}-prompts/${id}/archive`, {}, {
        headers: authHeaders(token),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", `${skill}-prompts`] }),
  });
}
