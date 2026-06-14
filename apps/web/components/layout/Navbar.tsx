"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth, useUser, useClerk } from "@clerk/nextjs";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import {
  ChevronDown, LogOut, User2,
  Settings, Zap, Menu,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { NAV_LINKS } from "@/lib/nav-links";

// ── Plan badge ────────────────────────────────────────────────────────────────

type Plan = "pro" | "starter" | string;

function PlanBadge({ plan, size = "sm" }: { plan: Plan; size?: "xs" | "sm" }) {
  const label = plan === "pro" ? "Pro" : "Starter";
  const cls =
    plan === "pro"
      ? "bg-primary/10 border-primary/25 text-primary"
      : "bg-white/[0.05] border-white/[0.10] text-white/35";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold select-none",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        cls,
      )}
    >
      <Zap className={size === "xs" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      {label}
    </span>
  );
}

// ── Brand ─────────────────────────────────────────────────────────────────────

function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center select-none group shrink-0"
      aria-label="CELPIPBRO home"
    >
      <span className="text-2xl sm:text-3xl font-black tracking-tight text-white group-hover:text-white/90 transition-colors">
        CELPIP
      </span>
      <span className="text-2xl sm:text-3xl font-black tracking-tight text-primary group-hover:text-primary-hover transition-colors">
        BRO
      </span>
    </Link>
  );
}


function NavLinks({ pathname, onClick }: { pathname: string; onClick?: () => void }) {
  return (
    <>
      {NAV_LINKS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={cn(
              "relative text-sm font-medium transition-colors duration-150 whitespace-nowrap px-1 py-0.5 group",
              active
                ? "text-primary"
                : "text-white/55 hover:text-white/90",
            )}
          >
            {label}
            {/* underline indicator */}
            <span
              className={cn(
                "absolute -bottom-0.5 left-0 h-[2px] w-full rounded-full transition-all duration-200",
                active
                  ? "bg-primary opacity-100"
                  : "bg-primary opacity-0 group-hover:opacity-40",
              )}
            />
          </Link>
        );
      })}
    </>
  );
}

// ── Profile dropdown ──────────────────────────────────────────────────────────

function ProfileDropdown() {
  const { user }          = useUser();
  const { user: appUser } = useCurrentUser();
  const { signOut }       = useClerk();
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);

  const plan        = appUser?.plan ?? "starter";
  const displayName = user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "Account";
  const email       = user?.primaryEmailAddress?.emailAddress ?? "";
  const avatarUrl   = user?.imageUrl ?? null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      // Escape closes the dropdown — keyboard users can dismiss without
      // tabbing through every menu item. Only act when the dropdown is open
      // so we don't fight other Escape handlers on the page.
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Trigger button */}
      <button
        id="profile-dropdown-trigger"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full",
          "border transition-all duration-150",
          open
            ? "border-primary/30 bg-primary/10"
            : "border-white/[0.08] hover:border-primary/20 hover:bg-white/[0.04]",
        )}
      >
        {/* Avatar — fixed 32×32 so next/image can serve a tiny optimized
            variant from Clerk's image host (allowlisted in next.config.mjs).
            alt="" + role="img" hides the redundant displayName from SR since
            the name renders right next to the avatar in the same dropdown. */}
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/70 ring-offset-1 ring-offset-black shrink-0"
            // Critical avatar visible above the fold on every page → priority.
            priority
            // Generic profile image — no need for SR to announce it.
            aria-hidden="true"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <User2 className="w-4 h-4 text-primary" />
          </div>
        )}

        {/* Plan badge (always visible) */}
        <PlanBadge plan={plan} size="xs" />

        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-white/40 transition-transform duration-200 shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={cn(
            "absolute right-0 mt-2 w-64 rounded-xl z-50",
            "border border-white/[0.08] bg-[#111318]/95 backdrop-blur-xl",
            "shadow-[0_16px_48px_rgba(0,0,0,0.7)]",
            "py-1 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150",
          )}
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="text-sm font-semibold text-white/90 truncate">{displayName}</p>
            {email && displayName !== email && (
              <p className="text-xs text-white/35 truncate mt-0.5">{email}</p>
            )}
            <div className="mt-2">
              <PlanBadge plan={plan} size="sm" />
            </div>
          </div>

          {/* nav items */}
          <div className="py-1">
            {[
              { href: "/settings", label: "Settings", icon: Settings },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/50 hover:text-white/90 hover:bg-white/[0.04] transition-colors"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Sign out */}
          <div className="border-t border-white/[0.06] py-1">
            <button
              id="profile-signout-btn"
              onClick={() => signOut({ redirectUrl: "/" })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400/80 hover:text-red-300 hover:bg-red-500/[0.06] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

export function Navbar() {
  const pathname                 = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Stable callback — safe to pass as prop and include in useEffect deps
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const showAuthNav   = isLoaded && !!isSignedIn;
  const showPublicNav = isLoaded && !isSignedIn;  // never true while loading → no flash

  return (
    <>
      {/* Mobile slide-in drawer */}
      {showAuthNav && (
        <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      )}

      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          "bg-[#000000]/95 backdrop-blur-md border-b border-white/[0.18]",
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-6">

            {/* Brand — always left */}
            <Brand />

            {/* Spacer — pushes everything else to the right */}
            <div className="flex-1" />

            {/* Right side — nav links + profile (desktop) */}
            <div className="flex items-center gap-3 sm:gap-6 shrink-0">

              {/* Nav links — desktop only, auth users */}
              {showAuthNav && (
                <nav className="hidden lg:flex items-center gap-5">
                  <NavLinks pathname={pathname} />
                </nav>
              )}

              {/* Public nav links */}
              {showPublicNav && (
                <>
                  <Link href="/terms"   className="hidden sm:inline text-xs text-white/55 hover:text-primary transition-colors">Terms</Link>
                  <Link href="/privacy" className="hidden sm:inline text-xs text-white/55 hover:text-primary transition-colors">Privacy</Link>
                  <Link href="/contact" className="hidden sm:inline text-xs text-white/55 hover:text-primary transition-colors">Contact</Link>
                  <Link href="/sign-in" className="hidden sm:inline text-sm font-medium text-white/55 hover:text-white/90 transition-colors">Sign In</Link>
                  <Link href="/sign-up" className="text-sm font-semibold bg-primary hover:bg-primary-hover text-primary-foreground px-3 py-1 sm:px-4 sm:py-1.5 rounded-lg transition-colors whitespace-nowrap">Get Started</Link>
                </>
              )}

              {showAuthNav && <ProfileDropdown />}

              {/* Hamburger — mobile only, opens the slide-in Sidebar.
                  aria-expanded mirrors the disclosure state; aria-controls
                  points at the sidebar so SRs know what this button operates. */}
              {showAuthNav && (
                <button
                  id="mobile-menu-trigger"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.04] transition-colors"
                  aria-label="Open navigation menu"
                  aria-expanded={sidebarOpen}
                  aria-controls="mobile-sidebar"
                >
                  <Menu className="w-4 h-4 text-white/70" aria-hidden="true" />
                </button>
              )}

            </div>
          </div>
        </div>
      </header>
    </>
  );
}
