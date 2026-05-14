"use client";

// ─────────────────────────────────────────────────────────────────────────────
// TosGateModal.tsx — Non-dismissable Terms of Service acceptance dialog
//
// Renders as a full-screen overlay whenever the signed-in user has not yet
// accepted the current Terms of Service version.  All navigation and content
// behind the modal is blocked until the user checks the box and submits.
//
// Flow:
//   1. useCurrentUser() returns user.tos_accepted_at / user.tos_version.
//   2. If tos_version !== TOS_CURRENT_VERSION (or tos_accepted_at is null),
//      this modal blocks the entire app.
//   3. User ticks the checkbox and clicks "I Agree".
//   4. useAcceptTos() calls POST /api/v1/users/me/accept-tos → updates user.
//   5. useCurrentUser() cache is invalidated → modal disappears.
// ─────────────────────────────────────────────────────────────────────────────

import { useState }       from "react";
import Link               from "next/link";
import { useAcceptTos }   from "@/lib/hooks/useAccount";
import { Loader2, ShieldCheck } from "lucide-react";

// Must match settings.TOS_CURRENT_VERSION on the backend.
const TOS_CURRENT_VERSION = "2026-05-14";

interface TosGateModalProps {
  tosVersion:    string | null | undefined;
  tosAcceptedAt: string | null | undefined;
}

export function TosGateModal({ tosVersion, tosAcceptedAt }: TosGateModalProps) {
  const [agreed, setAgreed]   = useState(false);
  const acceptTos              = useAcceptTos();

  const needsAcceptance =
    !tosAcceptedAt || tosVersion !== TOS_CURRENT_VERSION;

  if (!needsAcceptance) return null;

  async function handleAgree() {
    if (!agreed) return;
    try {
      await acceptTos.mutateAsync({ version: TOS_CURRENT_VERSION });
    } catch {
      // Error is displayed below via acceptTos.isError
    }
  }

  return (
    /* Full-screen backdrop — pointer-events block all interaction underneath */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-labelledby="tos-modal-title"
    >
      <div className="relative mx-4 w-full max-w-lg rounded-2xl border border-amber-500/30 bg-[#0e0e0e] p-8 shadow-[0_0_80px_rgba(245,158,11,0.15)]">
        {/* Icon */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 ring-2 ring-amber-500/30">
            <ShieldCheck className="h-8 w-8 text-amber-400" />
          </div>
        </div>

        {/* Heading */}
        <h2
          id="tos-modal-title"
          className="mb-2 text-center text-2xl font-bold text-white"
        >
          Terms of Service
        </h2>
        <p className="mb-6 text-center text-sm text-gray-400">
          Before you continue, please review and accept our Terms of Service
          and Privacy Policy, effective May 14, 2026.
        </p>

        {/* Summary box */}
        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300 space-y-2 leading-relaxed">
          <p>
            <strong className="text-white">What you&rsquo;re agreeing to:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use CELPIPBRO for personal, lawful study purposes only.</li>
            <li>Not share, resell, or redistribute AI-generated content or paid access.</li>
            <li>Scores are AI-estimated practice scores — not official CELPIP results.</li>
            <li>You must be at least 14 years old to use CELPIPBRO.</li>
            <li>Voice recordings may be collected and transcribed to provide feedback.</li>
            <li>We handle your personal information under Quebec&rsquo;s Law 25. We do not sell your data.</li>
          </ul>
        </div>

        {/* Links */}
        <div className="mb-6 flex gap-4 text-sm justify-center">
          <Link
            href="/terms"
            target="_blank"
            className="text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors"
          >
            Full Terms of Service ↗
          </Link>
          <Link
            href="/privacy"
            target="_blank"
            className="text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors"
          >
            Privacy Policy ↗
          </Link>
        </div>

        {/* Checkbox */}
        <label className="mb-6 flex cursor-pointer select-none items-start gap-3 rounded-xl border border-white/10 p-4 transition-colors hover:border-amber-500/40">
          <input
            type="checkbox"
            id="tos-checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 cursor-pointer rounded border-gray-600 bg-gray-800 accent-amber-500"
          />
          <span className="text-sm text-gray-300 leading-relaxed">
            I have read and agree to the{" "}
            <Link href="/terms" target="_blank" className="text-amber-400 underline hover:text-amber-300">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="text-amber-400 underline hover:text-amber-300">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {/* Error */}
        {acceptTos.isError && (
          <p className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
            Something went wrong. Please try again.
          </p>
        )}

        {/* CTA */}
        <button
          type="button"
          id="tos-agree-btn"
          onClick={handleAgree}
          disabled={!agreed || acceptTos.isPending}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 py-3 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {acceptTos.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "I Agree — Continue to CELPIPBRO"
          )}
        </button>

        <p className="mt-4 text-center text-xs text-gray-600">
          Version {TOS_CURRENT_VERSION} · Last updated May 2026
        </p>
      </div>
    </div>
  );
}
