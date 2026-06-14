import { NextResponse }                          from "next/server";
import { clerkMiddleware, createRouteMatcher }   from "@clerk/nextjs/server";

/**
 * Public routes — these do NOT require authentication.
 * Everything else is implicitly protected.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/terms",
  "/privacy",
  "/contact",
  // SEO / crawl files — must be publicly accessible for Googlebot
  "/sitemap.xml",
  "/robots.txt",
  // Add future public marketing pages here, e.g. "/about", "/pricing"
]);

/**
 * Admin routes — gated by both authentication AND role. The role check lives
 * here so a signed-in non-admin who guesses /admin/* is redirected before
 * any admin layout server-component runs. The app/admin layout still does
 * its own currentUser()-based check as a backstop (defense in depth).
 *
 * NOTE: requires the Clerk JWT template to surface `publicMetadata.role`.
 * Without that claim the middleware will treat the user as a non-admin
 * (deny by default) — never accidentally grant access.
 */
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  if (isAdminRoute(request)) {
    const { sessionClaims } = await auth();
    // Tolerate two common Clerk JWT-template shapes:
    //   { publicMetadata: { role: "admin" } }   (Backend API surfaces this)
    //   { metadata: { role: "admin" } }         (some custom templates)
    const meta = (sessionClaims?.publicMetadata as { role?: string } | undefined)
              ?? (sessionClaims?.metadata       as { role?: string } | undefined)
              ?? null;
    if (meta?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search   = "";
      return NextResponse.redirect(url);
    }
  }
});

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
