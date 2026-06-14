// ─────────────────────────────────────────────────────────────────────────────
// usePlanEvents.ts — Server-Sent Events hook for real-time plan upgrades
//
// Two-step authentication (JWT never in URL):
//   1. POST /billing/sse-token with Bearer JWT → receive 90 s opaque token.
//   2. Open EventSource with ?token=<opaque_token> (safe in access logs).
//
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
import { API_V1, api, authHeaders } from "@/lib/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SSE_ENDPOINT = `${API_BASE_URL}/api/v1/billing/plan-events`;
const SSE_TOKEN_ENDPOINT = `${API_V1}/billing/sse-token`;

/** Base delay between reconnect attempts (ms). Backoff is exponential and
 *  capped at MAX_RECONNECT_DELAY_MS — gentler than the previous linear
 *  schedule for callers behind corporate proxies that close long connections. */
const BASE_RECONNECT_DELAY_MS = 1_500;
const MAX_RECONNECT_DELAY_MS  = 60_000;

/** Maximum number of consecutive reconnect attempts before standing down.
 *  We reset the counter to zero on `visibilitychange → visible`, so a user
 *  returning to a tab that exhausted its retries gets a fresh budget instead
 *  of being permanently disconnected. */
const MAX_RETRIES = 10;

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Subscribes to the backend's SSE plan-events stream and invalidates React
 * Query caches when a `plan-updated` event is received.
 *
 * Security: mints a short-lived opaque token via POST /billing/sse-token
 * before opening the EventSource, so the full Clerk JWT never appears in
 * any URL or access log.
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

    /** Mint a short-lived opaque SSE token via POST /billing/sse-token. */
    async function mintSseToken(): Promise<string | null> {
      try {
        const token = await getToken();
        const { token: sseToken } = await api.post<{ token: string; expires_in: number }>(
          SSE_TOKEN_ENDPOINT,
          {},
          { headers: authHeaders(token) },
        );
        return sseToken;
      } catch (err) {
        console.warn("[usePlanEvents] Failed to mint SSE token:", err);
        return null;
      }
    }

    /** Open (or re-open) the SSE connection. */
    async function connect(): Promise<void> {
      if (cancelled) return;

      // Tear down any existing connection before opening a new one.
      cleanup();

      // Step 1: mint the opaque SSE token (Clerk JWT in header, never in URL)
      const sseToken = await mintSseToken();
      if (!sseToken || cancelled) {
        scheduleReconnect();
        return;
      }

      // Step 2: open EventSource with the safe opaque token
      const url = `${SSE_ENDPOINT}?token=${encodeURIComponent(sseToken)}`;
      const es  = new EventSource(url);
      esRef.current = es;

      // ── Event: connection confirmed ────────────────────────────────────────
      es.addEventListener("connected", () => {
        retriesRef.current = 0; // reset backoff on successful connect
      });

      // ── Event: plan upgraded ───────────────────────────────────────────────
      es.addEventListener("plan-updated", (ev: MessageEvent) => {
        let data: { plan?: string; user_id?: string } | null = null;
        try {
          data = JSON.parse(ev.data);
        } catch {
          // Non-critical — we still invalidate the cache below.
        }

        // Defense-in-depth user_id check. The backend SSE handler is already
        // user-scoped via the opaque token, but in a hypothetical reconnect-
        // token-rotation race the stream could be momentarily wrong. Drop
        // events whose payload disagrees with this client's user instead of
        // invalidating the wrong user's caches.
        if (data?.user_id && userId && data.user_id !== userId) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              "[usePlanEvents] discarding plan-updated for user %s while signed in as %s",
              data.user_id, userId,
            );
          }
          return;
        }

        // Immediately re-fetch the queries so the UI reflects the new plan
        // without the user needing to reload.
        //
        // The report query uses staleTime: Infinity (reports are immutable),
        // so invalidation is the ONLY way it will re-fetch. Without this,
        // a freshly-upgraded user would still see locked overlays on their
        // previously-loaded report — the new pro-only fields would not be
        // pulled from the backend until they hard-refreshed.
        queryClient.invalidateQueries({ queryKey: ["current-user", userId] });
        queryClient.invalidateQueries({ queryKey: billingStatusKey(userId) });
        queryClient.invalidateQueries({ queryKey: ["report"] });
      });

      // ── Error handler ──────────────────────────────────────────────────────
      // EventSource dispatches the same "error" event for transport drops
      // (plain Event) AND server-sent `event: error` frames (MessageEvent),
      // so this single listener is the only place reconnects are scheduled.
      // Registering both addEventListener("error") and es.onerror would fire
      // the reconnect twice per failure.
      es.addEventListener("error", (ev: Event) => {
        if (ev instanceof MessageEvent) {
          try {
            const detail = JSON.parse(ev.data) as { detail: string };
            console.warn("[usePlanEvents] server error frame:", detail.detail);
          } catch {
            // non-JSON error frame — reconnect anyway
          }
        }
        // Close the dead stream first so the browser's native retry doesn't
        // race our manual reconnect, which mints a fresh single-use token.
        cleanup();
        scheduleReconnect();
      });
    }

    /** Schedule a reconnect with exponential backoff, capped. The counter is
     *  reset on `visibilitychange → visible` (see below) so a tab that
     *  exhausted its retries while backgrounded gets a fresh budget when the
     *  user returns. Adds 0–500 ms of jitter so a fleet doesn't reconnect in
     *  lockstep after an outage. */
    function scheduleReconnect(): void {
      if (cancelled) return;
      if (retriesRef.current >= MAX_RETRIES) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[usePlanEvents] Max retries (${MAX_RETRIES}) reached — pausing until tab regains focus.`,
          );
        }
        return;
      }
      retriesRef.current += 1;
      const exp    = Math.min(
        MAX_RECONNECT_DELAY_MS,
        BASE_RECONNECT_DELAY_MS * 2 ** (retriesRef.current - 1),
      );
      const jitter = Math.floor(Math.random() * 500);
      const delay  = exp + jitter;

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

    // When the tab becomes visible after being backgrounded, reset the retry
    // counter and attempt a fresh connect. Corporate proxies often close
    // long-lived SSE connections on idle; without this, a user returning to
    // an exhausted tab would silently miss every subsequent plan-update.
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      retriesRef.current = 0;
      // Only re-open if we're not already connected. EventSource exposes
      // readyState (0=connecting, 1=open, 2=closed).
      if (!esRef.current || esRef.current.readyState === EventSource.CLOSED) {
        connect();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Cleanup when the component unmounts, the user signs out, or userId changes.
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, userId]);
}
