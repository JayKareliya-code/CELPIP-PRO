"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_V1, authHeaders } from "@/lib/api";

export interface CmsMaterial {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  material_type: string;
  module: string;
  skill: string | null;
  status: "draft" | "published" | "archived";
  difficulty: string | null;
  estimated_read_minutes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MaterialCreatePayload {
  slug: string;
  title: string;
  summary?: string;
  material_type: string;
  module: string;
  skill?: string;
  body_markdown?: string;
  difficulty?: string;
  estimated_read_minutes?: number;
  sort_order?: number;
}

export function useAdminMaterials(filters?: {
  status?: string;
  module?: string;
  material_type?: string;
  search?: string;
}) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "materials", filters],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.module) params.set("module", filters.module);
      if (filters?.material_type) params.set("material_type", filters.material_type);
      if (filters?.search) params.set("search", filters.search);
      const qs = params.toString() ? `?${params}` : "";
      return api.get<CmsMaterial[]>(`${API_V1}/admin/materials${qs}`, {
        headers: authHeaders(token),
      });
    },
  });
}

export function useCreateMaterial() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MaterialCreatePayload) => {
      const token = await getToken();
      return api.post<CmsMaterial>(`${API_V1}/admin/materials`, payload, {
        headers: authHeaders(token),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "materials"] }),
  });
}

export function usePublishMaterial() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.post(`${API_V1}/admin/materials/${id}/publish`, {}, {
        headers: authHeaders(token),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "materials"] }),
  });
}

export function useArchiveMaterial() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.post(`${API_V1}/admin/materials/${id}/archive`, {}, {
        headers: authHeaders(token),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "materials"] }),
  });
}
