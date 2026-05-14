"use client";

// ─────────────────────────────────────────────────────────────────────────────
// TosGateWrapper.tsx — Client boundary for the TOS + onboarding gates
//
// Gate order (both are non-dismissable overlays):
//   1. TosGateModal      — user must accept current TOS version
//   2. TargetBandGateModal — user must set their target band (required for
//                            personalised AI feedback and report labels)
//
// Once both are satisfied the children (full app) render normally.
// ─────────────────────────────────────────────────────────────────────────────

import { useCurrentUser }         from "@/lib/hooks/useCurrentUser";
import { TosGateModal }           from "@/components/common/TosGateModal";
import { TargetBandGateModal }    from "@/components/common/TargetBandGateModal";

// Must match settings.TOS_CURRENT_VERSION on the backend.
const TOS_CURRENT_VERSION = "2026-05-14";

export function TosGateWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useCurrentUser();

  const tosAccepted =
    !!user?.tos_accepted_at && user?.tos_version === TOS_CURRENT_VERSION;

  const needsTargetBand =
    tosAccepted && user?.target_band === null;

  return (
    <>
      {/* Render children regardless — gates overlay everything */}
      {children}

      {/* Gate 1: TOS acceptance */}
      {!isLoading && user && (
        <TosGateModal
          tosVersion={user.tos_version}
          tosAcceptedAt={user.tos_accepted_at}
        />
      )}

      {/* Gate 2: Target band (only shown once TOS is done) */}
      {!isLoading && needsTargetBand && (
        <TargetBandGateModal />
      )}
    </>
  );
}
