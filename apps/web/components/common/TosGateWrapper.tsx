"use client";

// ─────────────────────────────────────────────────────────────────────────────
// TosGateWrapper.tsx — Client boundary for the TOS gate in the server layout
//
// The main layout is a Server Component (needed for auth() and redirect()).
// This thin client wrapper fetches the current user and renders TosGateModal
// when the user has not yet accepted the current ToS version.
// ─────────────────────────────────────────────────────────────────────────────

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { TosGateModal }   from "@/components/common/TosGateModal";

export function TosGateWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useCurrentUser();

  return (
    <>
      {/* Render children regardless — the modal overlays everything */}
      {children}

      {/* TOS gate: only shown when user data is loaded and acceptance is missing */}
      {!isLoading && user && (
        <TosGateModal
          tosVersion={user.tos_version}
          tosAcceptedAt={user.tos_accepted_at}
        />
      )}
    </>
  );
}
