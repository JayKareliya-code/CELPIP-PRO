import type { Metadata } from "next";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = { title: "Billing & Plans" };

/**
 * Billing page placeholder — /billing
 * Stripe integration, plan upgrade flow, and purchase confirmation come in Phase 3.
 */
export default function BillingPage() {
  return (
    <PageWrapper>
      <PlaceholderPage
        title="Billing &amp; Plans"
        description="Plan upgrade flow, Stripe integration, and purchase history are coming in Phase 3."
        availableIn="Phase 3"
        cta={{ label: "Back to Dashboard", href: "/dashboard" }}
      />
    </PageWrapper>
  );
}
