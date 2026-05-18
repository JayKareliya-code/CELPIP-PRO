"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useMicPermission.ts — Microphone permission status + on-demand request hook.
//
// Combines three signals:
//   1. A `mic_permission` cookie cache for fast initial render (avoids a flash
//      of the prompt banner before the Permissions API returns).
//   2. `navigator.permissions.query({ name: "microphone" })` for the
//      authoritative live state — also subscribed via `onchange` so the
//      banner reacts the instant the user toggles permission in site settings.
//   3. `navigator.mediaDevices.getUserMedia({ audio: true })` triggered by
//      the caller to surface the browser's native permission prompt.
//
// All cookie writes update on every state transition so subsequent page
// loads start with the right banner state without an API round-trip.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { getCookie, setCookie } from "@/lib/cookies";

export type MicPermissionState =
  | "granted"       // user has allowed microphone access
  | "denied"        // user (or browser) has blocked microphone access
  | "prompt"        // user hasn't decided yet — getUserMedia will trigger the prompt
  | "unsupported";  // Permissions API not available (older Safari, etc.)

const COOKIE_NAME = "mic_permission";
const COOKIE_DAYS = 30;

const _VALID_STATES = new Set<MicPermissionState>(["granted", "denied", "prompt", "unsupported"]);

function readCachedState(): MicPermissionState | null {
  const cached = getCookie(COOKIE_NAME);
  if (cached && _VALID_STATES.has(cached as MicPermissionState)) {
    return cached as MicPermissionState;
  }
  return null;
}

export interface UseMicPermissionReturn {
  /** null until the first probe completes (renders nothing). */
  state: MicPermissionState | null;
  /** True while we're confirming the current state from the Permissions API. */
  isChecking: boolean;
  /** Triggers the native browser prompt. No-op if already granted. */
  requestPermission: () => Promise<void>;
}

export function useMicPermission(): UseMicPermissionReturn {
  const [state, setState]         = useState<MicPermissionState | null>(null);
  const [isChecking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    let permStatus: PermissionStatus | null = null;

    // Optimistic: render from cookie cache while the real check runs.
    const cached = readCachedState();
    if (cached) setState(cached);

    // SSR safety + older-browser fallback.
    if (
      typeof navigator === "undefined" ||
      !navigator.permissions ||
      typeof navigator.permissions.query !== "function"
    ) {
      if (mounted) {
        setState("unsupported");
        setCookie(COOKIE_NAME, "unsupported", COOKIE_DAYS);
        setChecking(false);
      }
      return () => { mounted = false; };
    }

    function apply(s: PermissionState) {
      if (!mounted) return;
      const next = s as MicPermissionState;
      setState(next);
      setCookie(COOKIE_NAME, next, COOKIE_DAYS);
    }

    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        if (!mounted) return;
        permStatus = status;
        apply(status.state);
        // Live-update if user toggles the site permission in browser settings.
        status.onchange = () => apply(status.state);
        setChecking(false);
      })
      .catch(() => {
        if (!mounted) return;
        setState("unsupported");
        setCookie(COOKIE_NAME, "unsupported", COOKIE_DAYS);
        setChecking(false);
      });

    return () => {
      mounted = false;
      if (permStatus) permStatus.onchange = null;
    };
  }, []);

  async function requestPermission(): Promise<void> {
    // Already granted or unsupported — no work to do.
    if (state === "granted" || state === "unsupported") return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      setCookie(COOKIE_NAME, "unsupported", COOKIE_DAYS);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately — we only wanted the permission, not a recording.
      stream.getTracks().forEach((t) => t.stop());
      setState("granted");
      setCookie(COOKIE_NAME, "granted", COOKIE_DAYS);
    } catch (err: unknown) {
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      const next: MicPermissionState = denied ? "denied" : "prompt";
      setState(next);
      setCookie(COOKIE_NAME, next, COOKIE_DAYS);
    }
  }

  return { state, isChecking, requestPermission };
}
