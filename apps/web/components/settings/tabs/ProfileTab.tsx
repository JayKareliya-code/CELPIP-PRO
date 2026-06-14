"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/settings/tabs/ProfileTab.tsx
// ─────────────────────────────────────────────────────────────────────────────

import Image from "next/image";
import { CalendarDays, ExternalLink, Flame, Target } from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Section }        from "@/components/settings/shared/Section";
import { PlanBadge }      from "@/components/settings/shared/PlanBadge";

export function ProfileTab() {
  const { user: clerkUser } = useUser();
  const { openUserProfile } = useClerk();
  const { user }            = useCurrentUser();

  const displayName = clerkUser?.fullName ?? clerkUser?.username ?? "Account";
  const email       = clerkUser?.primaryEmailAddress?.emailAddress ?? "";
  const avatarUrl   = clerkUser?.imageUrl ?? null;
  const joinedAt    = clerkUser?.createdAt
    ? new Date(clerkUser.createdAt).toLocaleDateString("en-CA", {
        year: "numeric", month: "long",
      })
    : null;

  return (
    <div className="space-y-4">
      <Section title="Your Account">

        {/* ── Identity row ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              // displayName appears as a heading right next to the avatar;
              // the image is decorative for sighted users and redundant for SR.
              alt=""
              aria-hidden="true"
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/20 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-white/90 truncate">{displayName}</p>
            {email && <p className="text-sm text-white/40 truncate">{email}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <PlanBadge plan={user?.plan ?? "starter"} />
              {joinedAt && (
                <span className="inline-flex items-center gap-1.5 text-xs text-white/35">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Member since {joinedAt}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick stats ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-white/35 font-semibold">
              Current Streak
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Flame className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold text-white/90">{user?.streak_days ?? 0}</p>
              <span className="text-sm text-white/40 mt-0.5">days</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-white/35 font-semibold">
              Target Band
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Target className="w-4 h-4 text-primary" />
              <p className="text-2xl font-bold text-white/90">{user?.target_band ?? "—"}</p>
              {user?.target_band && (
                <span className="text-sm text-white/40 mt-0.5">/ 12</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Clerk manage-account CTA ──────────────────────────────────── */}
        <button
          id="btn-manage-clerk-account"
          type="button"
          onClick={() => openUserProfile()}
          className="w-full flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/60 hover:text-white/90 hover:border-primary/20 hover:bg-primary/[0.04] transition-all duration-150"
        >
          <span className="font-medium">Manage account (name, email, password…)</span>
          <ExternalLink className="w-4 h-4 shrink-0" />
        </button>
      </Section>
    </div>
  );
}
