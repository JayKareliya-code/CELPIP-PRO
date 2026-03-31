"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRef } from "react";

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
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // useRef ensures the same QueryClient instance is reused across renders
  const queryClientRef = useRef<QueryClient | null>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          // Do not retry on the client by default — let the UI surface errors
          retry: 1,
          // Keep data fresh for 60 seconds before a background refetch
          staleTime: 60_000,
        },
      },
    });
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      {children}
    </QueryClientProvider>
  );
}
