// ─────────────────────────────────────────────────────────────────────────────
// lib/cookies.ts — Minimal client-side cookie helpers.
//
// We don't pull in js-cookie / cookies-next for a single feature; both calls
// are typed and SSR-safe (no-op when `document` is undefined).
// ─────────────────────────────────────────────────────────────────────────────

/** Read a cookie value. Returns null on SSR or when the cookie is absent. */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${encodeURIComponent(name)}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Set a cookie that survives `days` days (default 30).
 *
 * - `path=/` so the cookie is visible across the whole app.
 * - `SameSite=Lax` is the modern default and matches Clerk's session cookies.
 * - Not flagged `Secure` because dev runs over http://localhost; if you ever
 *   move to https-only, add it here.
 */
export function setCookie(name: string, value: string, days = 30): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 86_400_000).toUTCString();
  document.cookie =
    `${encodeURIComponent(name)}=${encodeURIComponent(value)};` +
    ` expires=${expires}; path=/; SameSite=Lax`;
}
