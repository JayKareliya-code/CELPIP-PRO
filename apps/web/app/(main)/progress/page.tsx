import type { Metadata } from "next";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = { title: "Progress" };

/**
 * Progress charts page placeholder — /progress
 * Band trend charts and weak-area detection come in Phase 3.
 */
export default function ProgressPage() {
  return (
    <PageWrapper>
      <PlaceholderPage
        title="Progress Charts"
        description="Band score trend charts and skill-level breakdowns are coming in Phase 3 once the scoring pipeline is live."
        availableIn="Phase 3"
        cta={{ label: "Back to Dashboard", href: "/dashboard" }}
      />
    </PageWrapper>
  );
}
