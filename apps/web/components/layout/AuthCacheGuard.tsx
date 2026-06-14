"use client";

// ─────────────────────────────────────────────────────────────────────────────
// AuthCacheGuard.tsx — Clears the React Query cache whenever the Clerk userId
// changes (sign-in, sign-out, or account switch).
//
// WHY THIS EXISTS
// ───────────────
// React Query's in-memory cache is shared for the lifetime of the browser tab.
// Without this guard, User B logging in after User A would receive User A's
// stale cached data (plan, profile, billing status) until the staleTime expired.
//
// HOW IT WORKS
// ────────────
// We track the previous userId in a ref. Any time Clerk resolves a *different*
// userId (including undefined → <id> on sign-in, or <id> → undefined on sign-out)
// we call queryClient.clear() to evict every cached entry in one shot, then set
// the ref to the new value so subsequent renders don't re-clear.
//
// Renders: zero — this component returns null.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { useUser }           from "@clerk/nextjs";
import { useQueryClient }    from "@tanstack/react-query";

export function AuthCacheGuard(): null {
  const { user: clerkUser, isLoaded } = useUser();
  const queryClient                   = useQueryClient();

  // Track the userId we last saw — undefined while Clerk is loading or signed out.
  const prevUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Wait until Clerk has finished loading before making any decision.
    if (!isLoaded) return;

    const currentUserId = clerkUser?.id;

    // No change — nothing to do.
    if (currentUserId === prevUserIdRef.current) return;

    // The userId changed (sign-in, sign-out, or account switch).
    // Wipe the entire cache so no stale data from the previous user leaks.
    if (prevUserIdRef.current !== undefined || currentUserId !== undefined) {
      if (process.env.NODE_ENV !== "production") {
        console.info(
          "[AuthCacheGuard] userId changed (%s → %s) — clearing client state.",
          prevUserIdRef.current ?? "none",
          currentUserId        ?? "none",
        );
      }
      queryClient.clear();

      // Also sweep client storage so namespaced caches (mock-exam session
      // UUIDs in localStorage, writing-draft timers in sessionStorage) cannot
      // bleed across users. We match the `celpip-*` prefix that this app uses
      // for all its own keys; everything else (Clerk, Stripe, third-party) is
      // left alone.
      try {
        const drop = (storage: Storage) => {
          const keys: string[] = [];
          for (let i = 0; i < storage.length; i++) {
            const k = storage.key(i);
            if (k && k.startsWith("celpip-")) keys.push(k);
          }
          keys.forEach((k) => storage.removeItem(k));
        };
        drop(window.localStorage);
        drop(window.sessionStorage);
      } catch {
        // SSR, quota errors, private mode — non-fatal.
      }
    }

    prevUserIdRef.current = currentUserId;
  }, [isLoaded, clerkUser?.id, queryClient]);

  return null;
}
