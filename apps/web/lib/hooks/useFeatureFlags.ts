/**
 * useFeatureFlags — TanStack Query hook for the /feature-flags endpoint.
 *
 * Usage:
 *   // Get all flags at once
 *   const flags = useFeatureFlags();
 *   if (flags["new_essay_prompt"]) { ... }
 *
 *   // Convenience helper — returns false while loading or on error
 *   const enabled = useIsEnabled("mock_exam_v2");
 *
 * Caching: staleTime is 60 s so the network is not hit on every render.
 * The query is skipped entirely when no auth token is available (e.g. on
 * the sign-in page) to avoid 401 noise in the console.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { apiFetch, authHeaders, API_V1 } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FeatureFlags = Record<string, boolean>;

interface FeatureFlagsResponse {
  flags: FeatureFlags;
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function fetchFeatureFlags(token: string): Promise<FeatureFlags> {
  const data = await apiFetch<FeatureFlagsResponse>(
    `${API_V1}/feature-flags`,
    { headers: authHeaders(token) },
  );
  return data.flags ?? {};
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Returns the full feature flags map for the current user.
 * Returns an empty object while loading or on error (all flags → false).
 */
export function useFeatureFlags(): FeatureFlags {
  const { getToken, isSignedIn } = useAuth();

  const { data } = useQuery<FeatureFlags>({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return {};
      return fetchFeatureFlags(token);
    },
    // Only fetch when the user is signed in — avoids 401 noise on public pages
    enabled: !!isSignedIn,
    staleTime:   60_000,   // 60 s — flags change rarely
    gcTime:      300_000,  // 5 min — keep cached value even after component unmounts
    retry:       1,        // one retry on network hiccup; fail silently after that
    // Return {} on error so callers always get a safe closed-by-default value
    placeholderData: {},
  });

  return data ?? {};
}

/**
 * Convenience: returns the boolean value of a single named flag.
 * Defaults to `false` while loading, on error, or for unknown flags.
 *
 * @param flag  The feature flag name (must match a KNOWN_FLAGS entry on the API)
 */
export function useIsEnabled(flag: string): boolean {
  const flags = useFeatureFlags();
  return flags[flag] ?? false;
}
