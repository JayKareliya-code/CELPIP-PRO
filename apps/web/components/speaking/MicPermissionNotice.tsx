"use client";

// ─────────────────────────────────────────────────────────────────────────────
// MicPermissionNotice.tsx — Inline banner that appears on speaking pages
// when the browser hasn't granted microphone permission yet.
//
// Renders nothing when the user has already granted permission, when the
// Permissions API isn't supported (rare), or while the initial probe is
// still in flight — so the banner never flashes during navigation.
//
// Three visible states:
//   "prompt"  → amber call-to-action: "Enable microphone" button triggers the
//              browser's native permission dialog.
//   "denied"  → rose informational note pointing the user at browser site
//              settings (the permission can only be re-granted there, not
//              from the page).
// ─────────────────────────────────────────────────────────────────────────────

import { Mic, MicOff } from "lucide-react";
import { useMicPermission } from "@/lib/hooks/useMicPermission";

export function MicPermissionNotice() {
  const { state, requestPermission } = useMicPermission();

  // No banner until we know the state; also hide when granted / unsupported.
  if (state === null || state === "granted" || state === "unsupported") {
    return null;
  }

  // ── State: denied — user (or browser policy) blocked mic access ─────────
  if (state === "denied") {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] px-5 py-3.5 flex items-start sm:items-center gap-3"
      >
        <MicOff className="h-4 w-4 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white/85">
            Microphone access is blocked
          </p>
          <p className="text-xs text-white/75 mt-0.5 leading-relaxed">
            Open this page&apos;s permissions in your browser&apos;s site
            settings and allow microphone access. On Chrome and Edge:{" "}
            <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono text-[10px]">⋮</kbd>
            {" "}→ Settings → Privacy and security → Site settings → Microphone.
            On Safari: Safari menu → Settings → Websites → Microphone. On
            mobile, open your device&apos;s app permissions for your browser.
          </p>
        </div>
      </div>
    );
  }

  // ── State: prompt — user hasn't decided yet ─────────────────────────────
  return (
    <div
      role="alert"
      className="rounded-2xl border border-primary/25 bg-primary/[0.04] px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Mic className="h-4 w-4 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/85">
            Microphone access required
          </p>
          <p className="text-xs text-white/55 mt-0.5 leading-relaxed">
            Allow your microphone so we can record your speaking practice.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={requestPermission}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shrink-0"
      >
        Enable microphone
      </button>
    </div>
  );
}
