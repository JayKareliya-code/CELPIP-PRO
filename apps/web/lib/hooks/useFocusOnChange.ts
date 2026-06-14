// ─────────────────────────────────────────────────────────────────────────────
// useFocusOnChange.ts — Move keyboard focus to a container when a key changes.
//
// The exam flow uses `key={phase}` to remount screen subtrees on every
// transition. That's intentional (resets local recorder state, plays the
// fade-in animation), but it destroys the keyboard-focused element with no
// replacement — keyboard and screen-reader users end up focused on the
// document body with no signal that the screen changed.
//
// This hook attaches a ref to the wrapper, and any time the supplied `key`
// value changes it focuses the wrapper. The wrapper must carry `tabIndex={-1}`
// so it can receive programmatic focus. We avoid `autoFocus` because Next.js
// strict-mode double-invokes useEffect, which would cause two focus moves.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef } from "react";

/**
 * Returns a ref that should be attached to the wrapper element. Whenever
 * `key` changes, focus is moved to that element (preserving scroll position).
 */
export function useFocusOnChange<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    // The element may already have a more specific focusable child (a heading
    // with tabIndex=-1, for example). We prefer that target so the SR's
    // announcement names the new screen; otherwise fall back to the wrapper.
    const root  = ref.current;
    if (!root) return;
    const heading = root.querySelector<HTMLElement>("[data-focus-on-mount], h1, h2");
    const target  = heading ?? root;
    try {
      target.focus({ preventScroll: true });
    } catch {
      // Some browsers reject preventScroll; fall back silently.
      target.focus();
    }
  }, [key]);

  return ref;
}
