// ─────────────────────────────────────────────────────────────────────────────
// useAccount.ts — account lifecycle actions (T&C acceptance, deletion)
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_V1, api, authHeaders } from "@/lib/api";
import type { AppUser } from "@/lib/types";

export function useAcceptTos() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<AppUser, Error, { version: string }>({
    mutationFn: async ({ version }) => {
      const token = await getToken();
      return api.post<AppUser>(
        `${API_V1}/users/me/accept-tos`,
        { version },
        { headers: authHeaders(token) },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
}

export function useSetTargetBand() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<AppUser, Error, { target_band: number }>({
    mutationFn: async ({ target_band }) => {
      const token = await getToken();
      return api.patch<AppUser>(
        `${API_V1}/users/me/target-score`,
        { target_band },
        { headers: authHeaders(token) },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
}


export function useDeleteAccount() {
  const { getToken, signOut } = useAuth();
  const clerk = useClerk();
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const token = await getToken();
      await api.deleteWithBody(
        `${API_V1}/users/me`,
        { confirm: "DELETE" },
        { headers: authHeaders(token) },
      );
      // Delete the Clerk identity so the user cannot sign back in.
      try {
        await clerk.user?.delete();
      } catch {
        // Fallback: at least sign out if Clerk delete is unavailable.
      }
      await signOut();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
