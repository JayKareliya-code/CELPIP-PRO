"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster }              from "sonner";
import { useClerk }             from "@clerk/nextjs";
import { useEffect, useRef }    from "react";
import { useRouter }            from "next/navigation";
import { AuthCacheGuard }       from "@/components/layout/AuthCacheGuard";
import { usePlanEvents }        from "@/lib/hooks/usePlanEvents";
import { ApiError, API_AUTH_EXPIRED_EVENT } from "@/lib/api";

/**
 * Mounts the SSE plan-events listener globally so that plan upgrades
 * are reflected in the UI from ANY page — not only when on /billing.
 */
function PlanEventsWatcher() {
  usePlanEvents();
  return null;
}

/**
 * Listens for the `celpip:auth-expired` event that apiFetch dispatches on
 * any 401 response. Reacts exactly once per session by signing the user out
 * and redirecting to the Clerk hosted sign-in. A debounce ref prevents a
 * burst of in-flight requests (all 401-ing at once after a token expires)
 * from firing N parallel signOut() calls.
 */
function AuthExpiredHandler() {
  const { signOut } = useClerk();
  const router      = useRouter();
  const handlingRef = useRef(false);

  useEffect(() => {
    const onExpired = () => {
      if (handlingRef.current) return;
      handlingRef.current = true;
      // Best-effort sign-out then redirect. If signOut itself rejects we
      // still navigate so the user is never stuck on a screen full of 401
      // toasts.
      signOut()
        .catch(() => { /* ignored — fall through to redirect */ })
        .finally(() => {
          router.replace("/sign-in");
        });
    };
    window.addEventListener(API_AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(API_AUTH_EXPIRED_EVENT, onExpired);
  }, [signOut, router]);

  return null;
}

/**
 * Client-side providers wrapper.
 *
 * Kept in a separate file from RootLayout because RootLayout is a Server
 * Component — providers that require client APIs (React Query, Zustand, etc.)
 * must live in a "use client" boundary.
 *
 * Pattern: create the QueryClient inside a ref so a new instance is NOT
 * created on every render, while still being created fresh per server request
 * in SSR/RSC environments.
 *
 * Security: AuthCacheGuard is mounted here so it runs for EVERY page.
 * It watches the Clerk userId and calls queryClient.clear() on any change,
 * preventing stale data from one user being served to another.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // useRef ensures the same QueryClient instance is reused across renders
  const queryClientRef = useRef<QueryClient | null>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          // Retry once on transient failure, never on deterministic errors.
          // 401 is handled by AuthExpiredHandler; retrying it would just
          // burn a second request before the sign-out fires.
          retry: (failureCount, error) => {
            if (error instanceof ApiError && [400, 401, 403, 404, 422].includes(error.status)) {
              return false;
            }
            return failureCount < 1;
          },
          // Conservative default: 30 s. Most queries override this individually.
          // Auth-scoped queries (current-user, billing-status) use per-query staleTime.
          staleTime: 30_000,
          // Never re-use data from a previous user session once the window refocuses.
          refetchOnWindowFocus: true,
        },
        mutations: {
          // Mutations should never auto-retry — a duplicate POST could create
          // a second Stripe Checkout Session or another DB row. Call sites
          // that genuinely want a retry must opt in explicitly.
          retry: 0,
        },
      },
    });
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      {/*
        AuthCacheGuard watches the Clerk userId and wipes the entire cache the
        moment it changes (sign-in, sign-out, account switch). This is the
        single most important guard against cross-user data leakage.
      */}
      <AuthCacheGuard />

      {/* Listens for 401s from apiFetch and signs the user out exactly once */}
      <AuthExpiredHandler />

      {/* Global SSE listener — keeps plan badge in sync after purchase from any page */}
      <PlanEventsWatcher />

      {children}

      {/* Sonner toast renderer — position and theme match the dark design system */}
      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast:        "bg-surface border border-border text-foreground text-sm rounded-xl shadow-panel",
            description:  "text-subtle",
            actionButton: "bg-primary text-white",
            cancelButton: "bg-muted text-foreground",
          },
        }}
      />
    </QueryClientProvider>
  );
}
