"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster }        from "sonner";
import { useRef }         from "react";
import { AuthCacheGuard } from "@/components/layout/AuthCacheGuard";

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
          // Retry once on failure — surfaces errors quickly without hammering the API.
          retry: 1,
          // Conservative default: 30 s. Most queries override this individually.
          // Auth-scoped queries (current-user, billing-status) use per-query staleTime.
          staleTime: 30_000,
          // Never re-use data from a previous user session once the window refocuses.
          refetchOnWindowFocus: true,
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
