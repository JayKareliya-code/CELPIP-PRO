"use client";

// ─────────────────────────────────────────────────────────────────────────────
// app/(main)/settings/page.tsx
//
// Thin orchestrator — handles URL state (tab query param) and renders the
// correct tab component. All business logic lives in components/settings/.
// ─────────────────────────────────────────────────────────────────────────────

import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 }                    from "lucide-react";

import { useCurrentUser }   from "@/lib/hooks/useCurrentUser";
import { PageWrapper }      from "@/components/layout/PageWrapper";
import { SettingsNav }      from "@/components/settings/SettingsNav";
import { SETTINGS_TABS, type SettingsTab } from "@/components/settings/types";

import { ProfileTab }      from "@/components/settings/tabs/ProfileTab";
import { GoalTab }         from "@/components/settings/tabs/GoalTab";
import { SubscriptionTab } from "@/components/settings/tabs/SubscriptionTab";
import { PrivacyTab }      from "@/components/settings/tabs/PrivacyTab";
import { DangerTab }       from "@/components/settings/tabs/DangerTab";

// Map tab ID → component (no switch/if chains needed)
const TAB_COMPONENTS: Record<SettingsTab, React.ReactNode> = {
  profile:      <ProfileTab />,
  goal:         <GoalTab />,
  subscription: <SubscriptionTab />,
  privacy:      <PrivacyTab />,
  danger:       <DangerTab />,
};

const VALID_TABS = new Set(SETTINGS_TABS.map((t) => t.id));

function resolveTab(raw: string | null): SettingsTab {
  return raw && VALID_TABS.has(raw as SettingsTab) ? (raw as SettingsTab) : "profile";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { user, isLoading } = useCurrentUser();

  const activeTab = resolveTab(searchParams.get("tab"));

  function handleTabChange(tab: SettingsTab) {
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  }

  if (isLoading || !user) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white/90 tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-white/40">
          Manage your account, practice goals, and data.
        </p>
      </div>

      {/* ── Layout: nav + content ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">
        <SettingsNav active={activeTab} onChange={handleTabChange} />

        <div className="flex-1 min-w-0">
          {TAB_COMPONENTS[activeTab]}
        </div>
      </div>
    </PageWrapper>
  );
}
