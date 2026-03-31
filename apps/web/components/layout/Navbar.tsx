"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import { BookOpen, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/speaking",  label: "Speaking"  },
  { href: "/writing",   label: "Writing"   },
  { href: "/history",   label: "History"   },
];

/**
 * Main site navigation bar.
 * - Transparent on landing page, white + shadow on all other pages.
 * - Shows auth state via useAuth() hook (Clerk v7 compatible).
 * - Mobile: hamburger toggle collapses to a full-width drawer.
 */
export function Navbar() {
  const pathname                 = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);

  const isLanding = pathname === "/";
  const isActive  = (href: string) => pathname.startsWith(href);

  // Close the mobile drawer whenever the route changes (soft navigation).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Track scroll depth for landing-page frosted-glass effect.
  // Guard: only update state when the boolean actually flips to avoid a
  // re-render on every scroll event beyond the 20 px threshold.
  useEffect(() => {
    if (!isLanding) return;
    const handleScroll = () => {
      const nextScrolled = window.scrollY > 20;
      setScrolled((prev) => (prev !== nextScrolled ? nextScrolled : prev));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLanding]);

  // Optimistic auth: middleware blocks unauthenticated access, so treat
  // "not yet loaded" as signed-in to prevent nav flicker on page transitions.
  const showAuthNav   = !isLoaded || !!isSignedIn;
  const showPublicNav = !showAuthNav;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isLanding && !scrolled
          ? "bg-transparent"
          : "bg-surface/95 backdrop-blur-md border-b border-border shadow-sm"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80 transition-opacity"
          >
            <BookOpen className="w-5 h-5" />
            <span>CELPIP<span className="text-subtle font-normal">Pro</span></span>
          </Link>

          {/* Desktop nav links — signed in only */}
          {showAuthNav && (
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive(link.href)
                      ? "bg-primary-light text-primary"
                      : "text-subtle hover:text-foreground hover:bg-muted"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">

            {/* Signed-out: Sign In + Get Started buttons */}
            {showPublicNav && (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm font-medium text-subtle hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}

            {/* Signed-in: avatar + mobile hamburger */}
            {showAuthNav && (
              <>
                <UserButton />
                <button
                  className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-label="Toggle menu"
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && showAuthNav && (
        <div className="md:hidden bg-surface border-t border-border px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "bg-primary-light text-primary"
                  : "text-subtle hover:text-foreground hover:bg-muted"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
