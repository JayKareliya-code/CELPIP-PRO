// ─────────────────────────────────────────────────────────────────────────────
// useCurrentUser.ts — Merged Clerk auth user + DB app user hook
//
// Phase 1: returns MOCK_USER when NEXT_PUBLIC_USE_MOCK=true.
// Phase 2: fetches GET /api/v1/users/me with the Clerk session token.
//
// All consumers depend only on this hook — never import MOCK_USER directly
// from mockData in page components.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useQuery }         from "@tanstack/react-query";
import { USE_MOCK, API_V1, api, authHeaders } from "@/lib/api";
import { MOCK_USER }        from "@/lib/mockData";
import type { AppUser }     from "@/lib/types";

// ── Public interface ──────────────────────────────────────────────────────────

export interface UseCurrentUserReturn {
  /** The merged app user. Null while loading or unauthenticated. */
  user: AppUser | null;
  isLoading: boolean;
  isError: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the current authenticated user as an AppUser.
 *
 * In mock mode (`NEXT_PUBLIC_USE_MOCK=true`) this returns MOCK_USER immediately.
 * In production it calls `GET /api/v1/users/me` with a Clerk Bearer token.
 * React Query cache key `["current-user"]` — all components share one result.
 */
export function useCurrentUser(): UseCurrentUserReturn {
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();
  const { getToken } = useAuth();

  const { data, isLoading, isError } = useQuery<AppUser>({
    queryKey: ["current-user"],

    queryFn: async (): Promise<AppUser> => {
      if (USE_MOCK) return MOCK_USER;
      const token = await getToken();
      return api.get<AppUser>(`${API_V1}/users/me`, {
        headers: authHeaders(token),
      });
    },

    enabled: USE_MOCK || (clerkLoaded && !!isSignedIn),
    staleTime: 5 * 60_000,
  });

  return {
    user: data ?? null,
    isLoading: !clerkLoaded || isLoading,
    isError,
  };
}
