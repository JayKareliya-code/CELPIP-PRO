// ─────────────────────────────────────────────────────────────────────────────
// next.config.mjs — Next.js 14 App Router config for CELPIP PRO
//
// Beyond `allowedDevOrigins` (LAN dev IPs), this file establishes the global
// security headers for every HTML response. Backend headers from the
// SecurityHeadersMiddleware fix only cover API responses; pages served by
// Next.js need their own. CSP is built dynamically so the dev experience
// stays permissive (HMR, Clerk-dev) while production is locked down.
// ─────────────────────────────────────────────────────────────────────────────

const isProd = process.env.NODE_ENV === "production";

// API origin pulled from the same env var the client uses. In dev we tolerate
// `http://localhost:8000`; in prod we require an explicit https origin so a
// missing env var fails the build instead of silently shipping a client that
// talks to localhost at runtime.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

if (isProd) {
    if (!process.env.NEXT_PUBLIC_API_URL) {
        throw new Error(
            "next.config.mjs: NEXT_PUBLIC_API_URL must be set for production builds. " +
            "Without it the client silently defaults to http://localhost:8000, which " +
            "fails in the browser and produces a confusing 'network error' on every page.",
        );
    }
    if (!API_ORIGIN.startsWith("https://")) {
        throw new Error(
            `next.config.mjs: NEXT_PUBLIC_API_URL must use https:// in production (got: ${API_ORIGIN}).`,
        );
    }
}

// Tight production CSP. Hosts listed are the only third parties this app
// actually talks to:
//   - Clerk          → auth (JS, API, JWKS, avatars, frame-based widgets)
//   - Stripe         → Checkout redirect + (optional) Elements iframes
//   - API_ORIGIN     → our own FastAPI backend
//   - S3 / R2        → presigned audio + scene-image fetches
//   - Sentry         → if NEXT_PUBLIC_SENTRY_DSN is set (browser SDK)
const clerkHosts = [
    // Production instance: Clerk's Frontend API is served from a custom subdomain
    // (clerk.<your-domain>). clerk-js, FAPI calls, and hosted widgets all load
    // from here, so it must be allowed or the browser blocks Clerk entirely.
    "https://clerk.celpipbro.ca",
    "https://accounts.celpipbro.ca",     // Clerk Account Portal (hosted sign-in pages)
    "https://*.clerk.accounts.dev",      // Development instance (local + preview)
    "https://*.clerk.com",
    "https://clerk.com",
    "https://challenges.cloudflare.com", // Clerk Turnstile bot check
];

const stripeHosts = [
    "https://js.stripe.com",
    "https://*.stripe.com",
    "https://*.stripe.network",
];

// Object storage for presigned uploads (browser → S3/R2 PUT) and presigned
// GET fetches. `*.amazonaws.com` matches both path-style (s3.<region>.amazonaws.com)
// and virtual-host (<bucket>.s3.<region>.amazonaws.com) URLs. Mirrors the
// hostnames already trusted in `images.remotePatterns` below.
const storageHosts = [
    "https://*.amazonaws.com",
    "https://*.r2.cloudflarestorage.com",
];

const cspDirectives = {
    "default-src": ["'self'"],
    // 'unsafe-inline' for scripts: Clerk and Next inject inline scripts;
    // dropping it requires nonce wiring on every Next page (deferred).
    // 'unsafe-eval' is dev-only — Next.js HMR + Clerk dev mode use eval.
    "script-src": ["'self'", "'unsafe-inline'", ...(isProd ? [] : ["'unsafe-eval'"]), ...clerkHosts, ...stripeHosts],
    "style-src": ["'self'", "'unsafe-inline'"], // Tailwind + shadcn inline styles
    "img-src": ["'self'", "data:", "blob:", "https:"],   // S3, Clerk avatars, OG images
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", API_ORIGIN, ...clerkHosts, ...stripeHosts, ...storageHosts, ...(isProd ? [] : ["ws:", "wss:"])],
    "frame-src": [...clerkHosts, ...stripeHosts],
    "media-src": ["'self'", "blob:", "https:"],            // recorded audio (blob), presigned playback (https)
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'", ...stripeHosts],                // Stripe Checkout POST target
    "frame-ancestors": ["'none'"],
};

const csp = Object.entries(cspDirectives)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");

const securityHeaders = [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Microphone allowed on this origin only (speaking module); camera off.
    { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(self)" },
];

// HSTS only in production — local dev runs over http://. 2-year max-age,
// includeSubDomains, preload-eligible.
if (isProd) {
    securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
    });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    allowedDevOrigins: ["10.150.0.143", "192.168.0.14"],

    // Hide the X-Powered-By: Next.js header — small fingerprinting reduction.
    poweredByHeader: false,

    // Explicit so a future engineer can't accidentally ship maps to prod.
    productionBrowserSourceMaps: false,

    // Strip console.log / console.info / console.debug from the production
    // bundle. Errors and warnings are preserved (`removeConsole.exclude`)
    // because those usually represent something we'd actually want to see
    // in a browser-extension bug report. Dev builds are unaffected.
    compiler: {
        removeConsole: isProd
            ? { exclude: ["error", "warn"] }
            : false,
    },

    // Image optimization domains — kept generous on https; tighten later
    // when we know the S3/R2 hostname pattern in production.
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "**.amazonaws.com" },
            { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
            { protocol: "https", hostname: "img.clerk.com" },
            { protocol: "https", hostname: "**.clerk.com" },
            { protocol: "https", hostname: "**.clerk.accounts.dev" },
        ],
    },

    async headers() {
        return [
            {
                source: "/(.*)",
                headers: securityHeaders,
            },
        ];
    },
};

export default nextConfig;
