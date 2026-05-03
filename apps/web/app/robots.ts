import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://celpipbro.ca";

/**
 * Native Next.js robots.txt generation.
 * Served automatically at /robots.txt
 *
 * - Googlebot and all crawlers: allowed on public routes only.
 * - Auth-gated and admin routes are disallowed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/contact", "/privacy", "/terms"],
        disallow: [
          "/dashboard",
          "/speaking",
          "/writing",
          "/history",
          "/progress",
          "/billing",
          "/settings",
          "/admin",
          "/sign-in",
          "/sign-up",
          "/attempts",
          "/api/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
