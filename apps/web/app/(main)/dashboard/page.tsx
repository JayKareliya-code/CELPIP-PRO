import type { Metadata } from "next";
import { PageWrapper }            from "@/components/layout/PageWrapper";
import { WelcomeBanner }          from "@/components/dashboard/WelcomeBanner";
import { DashboardStatusRow }     from "@/components/dashboard/DashboardStatusRow";
import { QuickStartCard }         from "@/components/dashboard/QuickStartCard";
import { RecentAttemptsCompact }  from "@/components/dashboard/RecentAttemptsCompact";
import { WeakAreasCompact }       from "@/components/dashboard/WeakAreasCompact";

export const metadata: Metadata = {
  title: "Dashboard — CELPIPBRO",
  description: "Your CELPIP practice hub — scores, streak, and quick access to all modules.",
};

/**
 * Dashboard page — server-component shell.
 * All data fetching happens inside client components via React Query.
 *
 * Layout (top → bottom):
 *   1. WelcomeBanner      — greeting + streak count
 *   2. DashboardStatusRow — Speaking band | Writing band | Target band
 *   3. QuickStartCard     — Speaking and Writing navigation links
 *   4. RecentAttemptsCompact — last 5 attempts
 *   5. WeakAreasCompact   — Pro only; hidden when no data or Starter plan
 */
export default function DashboardPage() {
  return (
    <PageWrapper>
      <div className="space-y-5">
        <WelcomeBanner />
        <DashboardStatusRow />
        <QuickStartCard />
        <RecentAttemptsCompact />
        <WeakAreasCompact />
      </div>
    </PageWrapper>
  );
}
