"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useAdminCalibrationSamples.ts — React Query hooks for calibration samples
//
// Covers: list (with filters), create, toggle active, delete.
// Phase 1: mock data bypasses these hooks (table uses props + local state).
// Phase 2: connect CalibrationSampleTable to these hooks directly.
// ─────────────────────────────────────────────────────────────────────────────

import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_V1, authHeaders } from "@/lib/api";
import type { CalibrationSample } from "@/lib/types";

// ── Query keys ────────────────────────────────────────────────────────────────

const QUERY_KEY = ["admin", "calibration-samples"] as const;

// ── Filters ───────────────────────────────────────────────────────────────────

export interface CalibrationSampleFilters {
  skill?:       string;
  task_number?: number;
  is_active?:   boolean;
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface CreateCalibrationSamplePayload {
  skill:       string;
  task_number: number;
  band_level:  number;
  sample_text: string;
  source?:     string;
  is_active?:  boolean;
}

export interface UpdateCalibrationSamplePayload {
  band_level?:  number;
  sample_text?: string;
  source?:      string;
  is_active?:   boolean;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Fetch all calibration samples with optional filtering. */
export function useAdminCalibrationSamples(filters?: CalibrationSampleFilters) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    queryFn: async () => {
      const token  = await getToken();
      const params = new URLSearchParams();
      if (filters?.skill)                        params.set("skill",       filters.skill);
      if (filters?.task_number != null)           params.set("task_number", String(filters.task_number));
      if (filters?.is_active   != null)           params.set("is_active",   String(filters.is_active));
      const qs = params.toString() ? `?${params}` : "";
      return api.get<CalibrationSample[]>(`${API_V1}/admin/calibration-samples${qs}`, {
        headers: authHeaders(token),
      });
    },
  });
}

/** Create a new calibration sample. */
export function useCreateCalibrationSample() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCalibrationSamplePayload) => {
      const token = await getToken();
      return api.post<CalibrationSample>(`${API_V1}/admin/calibration-samples`, payload, {
        headers: authHeaders(token),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

/** Update (PATCH) an existing calibration sample. */
export function useUpdateCalibrationSample() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateCalibrationSamplePayload }) => {
      const token = await getToken();
      return api.patch<CalibrationSample>(`${API_V1}/admin/calibration-samples/${id}`, payload, {
        headers: authHeaders(token),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

/** Toggle the `is_active` flag on a calibration sample. */
export function useToggleCalibrationSampleActive() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const token = await getToken();
      return api.patch<CalibrationSample>(
        `${API_V1}/admin/calibration-samples/${id}`,
        { is_active },
        { headers: authHeaders(token) },
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

/** Permanently delete a calibration sample. */
export function useDeleteCalibrationSample() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.delete(`${API_V1}/admin/calibration-samples/${id}`, {
        headers: authHeaders(token),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
