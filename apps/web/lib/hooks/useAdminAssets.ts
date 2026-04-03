"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_V1, authHeaders } from "@/lib/api";

export interface CmsAsset {
  id: string;
  asset_type: "image" | "pdf" | "doc" | "audio" | "video" | "other";
  title: string;
  original_filename: string;
  mime_type: string;
  public_url: string | null;
  thumbnail_url: string | null;
  file_size_bytes: number | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  caption: string | null;
  status: "active" | "archived" | "deleted";
  created_at: string;
}

export interface ConfirmUploadPayload {
  storage_key: string;
  title: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes?: number;
  alt_text?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export function useAdminAssets(filters?: { asset_type?: string; status?: string }) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "assets", filters],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams();
      if (filters?.asset_type) params.set("asset_type", filters.asset_type);
      params.set("status", filters?.status ?? "active");
      return api.get<CmsAsset[]>(`${API_V1}/admin/assets?${params}`, {
        headers: authHeaders(token),
      });
    },
  });
}

export function useGetUploadUrl() {
  const { getToken } = useAuth();
  return useMutation({
    mutationFn: async (payload: { filename: string; mime_type: string; title: string }) => {
      const token = await getToken();
      return api.post<{ upload_url: string; storage_key: string }>(
        `${API_V1}/admin/assets/upload-url`, payload, { headers: authHeaders(token) }
      );
    },
  });
}

export function useConfirmUpload() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ConfirmUploadPayload) => {
      const token = await getToken();
      return api.post<CmsAsset>(`${API_V1}/admin/assets/confirm`, payload, {
        headers: authHeaders(token),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "assets"] }),
  });
}

export function useArchiveAsset() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.post(`${API_V1}/admin/assets/${id}/archive`, {}, {
        headers: authHeaders(token),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "assets"] }),
  });
}
