// ─────────────────────────────────────────────────────────────────────────────
// lib/admin/calibrationApi.ts — Typed API helpers for calibration samples
//
// Covers: list, create, update (PUT), toggle-active (PATCH), delete.
// All endpoints require an admin bearer token.
// ─────────────────────────────────────────────────────────────────────────────

import { apiFetch, api, API_V1, authHeaders } from "@/lib/api";
import type { CalibrationSample, SpeakingPrompt, WritingPrompt } from "@/lib/types";

const BASE = `${API_V1}/admin/calibration`;

// ── Prompt-Level Anchor Patching ─────────────────────────────────────────────
// Patches ONLY the sample_response_band12 field on a prompt using the
// existing PATCH speaking/writing-prompts endpoint.
// Passing null clears the anchor (falls back to global pool).

export async function patchSpeakingPromptAnchor(
  id:    string,
  text:  string | null,
  token: string,
): Promise<SpeakingPrompt> {
  return apiFetch<SpeakingPrompt>(`${API_V1}/admin/speaking-prompts/${id}`, {
    method:  "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body:    JSON.stringify({ sample_response_band12: text }),
  });
}

export async function patchWritingPromptAnchor(
  id:    string,
  text:  string | null,
  token: string,
): Promise<WritingPrompt> {
  return apiFetch<WritingPrompt>(`${API_V1}/admin/writing-prompts/${id}`, {
    method:  "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body:    JSON.stringify({ sample_response_band12: text }),
  });
}


// ── API shape from the backend ────────────────────────────────────────────────

export interface CalibrationSamplePayload {
  skill:       "speaking" | "writing";
  task_number: number | null;
  band_level:  number;
  sample_text: string;
  source:      string;
  is_active:   boolean;
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listCalibrationSamples(token: string): Promise<CalibrationSample[]> {
  return api.get<CalibrationSample[]>(BASE, { headers: authHeaders(token) });
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createCalibrationSample(
  payload: CalibrationSamplePayload,
  token:   string,
): Promise<CalibrationSample> {
  return api.post<CalibrationSample>(BASE, payload, { headers: authHeaders(token) });
}

// ── Update (full replace) ─────────────────────────────────────────────────────

export async function updateCalibrationSample(
  id:      string,
  payload: CalibrationSamplePayload,
  token:   string,
): Promise<CalibrationSample> {
  return apiFetch<CalibrationSample>(`${BASE}/${id}`, {
    method:  "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
}

// ── Toggle active (PATCH) ─────────────────────────────────────────────────────

export async function toggleCalibrationSample(
  id:    string,
  token: string,
): Promise<CalibrationSample> {
  // Backend PATCH /calibration/:id takes no body — it toggles is_active in place.
  return apiFetch<CalibrationSample>(`${BASE}/${id}`, {
    method:  "PATCH",
    headers: authHeaders(token),
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteCalibrationSample(
  id:    string,
  token: string,
): Promise<void> {
  return api.delete<void>(`${BASE}/${id}`, { headers: authHeaders(token) });
}
