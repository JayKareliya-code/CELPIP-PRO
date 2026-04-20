// ─────────────────────────────────────────────────────────────────────────────
// usePlanEvents.ts — Server-Sent Events hook for real-time plan upgrades
//
// Opens an authenticated SSE connection to GET /api/v1/billing/plan-events.
// When the Stripe webhook fires and the backend upgrades the user's plan,
// this hook receives a `plan-updated` event and immediately invalidates the
// React Query caches for `current-user` and `billing-status`, causing every
// component that consumes those queries to re-fetch without a page reload.
//
// Usage:
//   Call once in a top-level component (e.g. BillingPageClient).
//   The hook manages its own lifecycle — it cleans up on unmount and
//   re-establishes the connection when the auth token changes.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQueryClient }   from "@tanstack/react-query";
import { billingStatusKey } from "@/lib/hooks/useBilling";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SSE_ENDPOINT = `${API_BASE_URL}/api/v1/billing/plan-events`;

/** Reconnect delay after an unexpected connection drop (ms). */
const RECONNECT_DELAY_MS = 3_000;

/** Maximum number of consecutive reconnect attempts before giving up. */
const MAX_RETRIES = 5;

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Subscribes to the backend's SSE plan-events stream and invalidates React
 * Query caches when a `plan-updated` event is received.
 *
 * Design decisions:
 *  - Uses the native `EventSource` API for maximum browser compatibility.
 *  - The Clerk JWT is passed as `?token=` because EventSource does not
 *    support custom request headers. The token is short-lived and transmitted
 *    only over HTTPS in production.
 *  - Falls back gracefully when the user is not signed in (no-op).
 *  - Implements manual exponential-ish backoff so the server isn't hammered
 *    if the endpoint is temporarily unavailable.
 */
export function usePlanEvents(): void {
  const { getToken, isSignedIn } = useAuth();
  const { user: clerkUser }      = useUser();
  const queryClient              = useQueryClient();

  const userId = clerkUser?.id ?? null;

  // Track the active EventSource and retry counter across renders.
  const esRef          = useRef<EventSource | null>(null);
  const retriesRef     = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only open a stream when the user is authenticated.
    if (!isSignedIn) return;

    let cancelled = false; // guards against stale async closures

    /** Open (or re-open) the SSE connection. */
    async function connect(): Promise<void> {
      if (cancelled) return;

      // Tear down any existing connection before opening a new one.
      cleanup();

      let token: string | null;
      try {
        token = await getToken();
      } catch {
        // Clerk not ready yet — retry after a delay.
        scheduleReconnect();
        return;
      }

      if (!token || cancelled) return;

      const url = `${SSE_ENDPOINT}?token=${encodeURIComponent(token)}`;
      const es  = new EventSource(url);
      esRef.current = es;

      // ── Event: connection confirmed ────────────────────────────────────────
      es.addEventListener("connected", () => {
        retriesRef.current = 0; // reset backoff on successful connect
      });

      // ── Event: plan upgraded ───────────────────────────────────────────────
      es.addEventListener("plan-updated", (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data) as { plan: string; user_id: string };
          console.info("[usePlanEvents] plan-updated received:", data);
        } catch {
          // Non-critical — we still invalidate the cache below.
        }

        // Immediately re-fetch both queries so the UI reflects the new plan
        // without the user needing to reload.
        // Use userId-scoped keys so we only invalidate THIS user's cache.
        queryClient.invalidateQueries({ queryKey: ["current-user", userId] });
        queryClient.invalidateQueries({ queryKey: billingStatusKey(userId) });
      });

      // ── Event: server-side error ───────────────────────────────────────────
      es.addEventListener("error", (ev: Event) => {
        // MessageEvent means the server sent an explicit `event: error` frame.
        if (ev instanceof MessageEvent) {
          try {
            const detail = JSON.parse(ev.data) as { detail: string };
            if (detail.detail === "Unauthorized") {
              // Token expired or invalid — do NOT reconnect, let the user
              // re-authenticate (Clerk will handle token refresh automatically
              // on the next page interaction).
              console.warn("[usePlanEvents] Unauthorized — not reconnecting.");
              cleanup();
              return;
            }
          } catch {
            // ignored
          }
        }

        // Generic connection error or server restarted — reconnect with backoff.
        scheduleReconnect();
      });

      // EventSource.onerror (transport-level, e.g. network down)
      es.onerror = () => {
        scheduleReconnect();
      };
    }

    /** Schedule a reconnect attempt with simple linear backoff. */
    function scheduleReconnect(): void {
      if (cancelled) return;
      if (retriesRef.current >= MAX_RETRIES) {
        console.warn(
          `[usePlanEvents] Max retries (${MAX_RETRIES}) reached — giving up.`
        );
        return;
      }
      retriesRef.current += 1;
      const delay = RECONNECT_DELAY_MS * retriesRef.current;

      reconnectTimer.current = setTimeout(() => {
        if (!cancelled) connect();
      }, delay);
    }

    /** Close the EventSource and clear any pending timer. */
    function cleanup(): void {
      if (reconnectTimer.current != null) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    }

    connect();

    // Cleanup when the component unmounts, the user signs out, or userId changes.
    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, userId]);
}
