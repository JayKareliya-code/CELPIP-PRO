import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://celpipbro.ca";

/**
 * Native Next.js App Router sitemap.
 * Served automatically at /sitemap.xml
 *
 * Only public, indexable routes are included.
 * Auth-gated routes (/dashboard, /speaking, /writing, etc.) are excluded
 * and are blocked separately in robots.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date("2026-04-22"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date("2026-04-22"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
}
