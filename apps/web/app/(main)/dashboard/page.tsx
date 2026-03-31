import type { Metadata } from "next";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { QuickStartCard } from "@/components/dashboard/QuickStartCard";
import { RecentAttemptsWidget } from "@/components/dashboard/RecentAttemptsWidget";
import { ProgressSummaryWidget } from "@/components/dashboard/ProgressSummaryWidget";
import { StreakWidget } from "@/components/dashboard/StreakWidget";
import { TargetBandWidget } from "@/components/dashboard/TargetBandWidget";
import { WeakAreasWidget } from "@/components/dashboard/WeakAreasWidget";
import { MOCK_USER, MOCK_RECENT_ATTEMPTS } from "@/lib/mockData";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your CELPIP practice hub — recent attempts, streak, and quick access to all modules.",
};

/**
 * Dashboard page — server component.
 * All widgets receive mock data as props; swap for real API calls in Day 10.
 */
export default function DashboardPage() {
  return (
    <PageWrapper>
      {/* Greeting + streak badge */}
      <WelcomeBanner user={MOCK_USER} />

      {/* Main grid: 3 cols on lg, single col on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column (2/3 width) ─────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-0">
          <QuickStartCard />
          <RecentAttemptsWidget attempts={MOCK_RECENT_ATTEMPTS} />
        </div>

        {/* ── Right column (1/3 width) ────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <TargetBandWidget user={MOCK_USER} />
          <StreakWidget user={MOCK_USER} />
          <ProgressSummaryWidget attempts={MOCK_RECENT_ATTEMPTS} />
          <WeakAreasWidget />
        </div>

      </div>
    </PageWrapper>
  );
}
