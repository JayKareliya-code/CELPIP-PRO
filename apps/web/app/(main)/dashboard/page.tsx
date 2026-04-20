import type { Metadata } from "next";
import { PageWrapper }         from "@/components/layout/PageWrapper";
import { WelcomeBanner }       from "@/components/dashboard/WelcomeBanner";
import { RecentAttemptsWidget } from "@/components/dashboard/RecentAttemptsWidget";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your CELPIP practice hub — recent attempts and quick access to all modules.",
};

/**
 * Dashboard page — server component shell.
 * Displays a greeting and the recent attempts table only.
 */
export default function DashboardPage() {
  return (
    <PageWrapper>
      <WelcomeBanner />
      <RecentAttemptsWidget />
    </PageWrapper>
  );
}
