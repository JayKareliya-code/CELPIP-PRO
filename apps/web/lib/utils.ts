import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names, resolving conflicts correctly.
 * Use this everywhere instead of string concatenation.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats seconds into MM:SS display string.
 * e.g. 90 → "1:30"
 */
export function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * Formats seconds into a compact short-form label.
 * e.g. 30 → "30s" | 60 → "1m" | 90 → "1m"
 *
 * Used on task cards and badges where MM:SS would be too wide.
 * Use formatTime() when you need precision (exam timers, etc.).
 */
export function formatShortDuration(seconds: number): string {
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`;
}

/**
 * Counts words in a string. Returns 0 for empty or whitespace-only input.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Returns the band colour class based on score (1–12 CELPIP scale).
 */
export function getBandColourClass(band: number): string {
  if (band >= 9) return "band-high";
  if (band >= 6) return "band-mid";
  return "band-low";
}

/**
 * Rounds a CELPIP band score to the nearest 0.5 increment.
 * This is the single source of truth for score display rounding across the app.
 *
 * Examples: 7.3 → 7.5 | 7.2 → 7.0 | 8.76 → 9.0 | 6.0 → 6.0
 *
 * Use this on every score before rendering — never call .toFixed() directly
 * on a raw band value without passing it through here first.
 */
export function roundBand(band: number): number {
  return Math.round(band * 2) / 2;
}

/**
 * Formats a band score for display: rounds to 0.5 then formats as "X.0" or "X.5".
 * Always returns one decimal place so "8" becomes "8.0" and "7.5" stays "7.5".
 */
export function formatBand(band: number): string {
  return roundBand(band).toFixed(1);
}

/**
 * Returns a friendly time-ago string.
 * e.g. "2 hours ago", "Yesterday"
 */
export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60)     return "Just now";
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Yesterday";
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}
