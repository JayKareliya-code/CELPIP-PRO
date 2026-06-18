// ─────────────────────────────────────────────────────────────────────────────
// useCurrentUser.ts — Merged Clerk auth user + DB app user hook
//
// Phase 1: returns MOCK_USER when NEXT_PUBLIC_USE_MOCK=true.
// Phase 2: fetches GET /api/v1/users/me with the Clerk session token.
//
// All consumers depend only on this hook — never import MOCK_USER directly
// from mockData in page components.
//
// Cache-safety: the query key includes the Clerk userId so different users
// never share a cache entry, even within the same browser tab session.
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
 *
 * Cache key: `["current-user", userId]` — the Clerk userId is part of the key
 * so that User A and User B are **never** served from the same cache entry.
 * AuthCacheGuard in Providers.tsx additionally calls queryClient.clear() on
 * every user switch for belt-and-suspenders protection.
 */
export function useCurrentUser(): UseCurrentUserReturn {
  const { user: clerkUser, isSignedIn, isLoaded: clerkLoaded } = useUser();
  const { getToken } = useAuth();

  // Include the userId in the cache key — different users → different cache slots.
  const userId = clerkUser?.id ?? null;

  const { data, isLoading, isError } = useQuery<AppUser>({
    // DO NOT use a static key like ["current-user"] — that leaks data across users.
    queryKey: ["current-user", userId],

    queryFn: async (): Promise<AppUser> => {
      if (USE_MOCK) return MOCK_USER;
      const token = await getToken();
      // Never send an unauthenticated request: a null token (brief Clerk
      // hydration window) would 401 and trip the global sign-out. Throw a
      // non-HTTP error instead — React Query retries once the token is ready.
      if (!token) throw new Error("Clerk session token not ready");
      return api.get<AppUser>(`${API_V1}/users/me`, {
        headers: authHeaders(token),
      });
    },

    enabled: USE_MOCK || (clerkLoaded && !!isSignedIn),
    // 2 minutes — short enough that plan changes propagate quickly. The SSE
    // hook (usePlanEvents) provides instant invalidation for plan upgrades.
    staleTime: 2 * 60_000,
    // Never serve stale user data to a freshly focused tab.
    refetchOnWindowFocus: true,
  });

  return {
    user: data ?? null,
    isLoading: !clerkLoaded || isLoading,
    isError,
  };
}
