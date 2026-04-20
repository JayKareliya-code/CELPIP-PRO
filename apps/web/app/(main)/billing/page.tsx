import type { Metadata } from "next";
import { BillingPageClient } from "@/components/billing/BillingPageClient";

export const metadata: Metadata = {
  title: "Billing & Plans",
  description: "View and manage your CELPIPBro plan. One-time payments — no subscriptions.",
};

/**
 * Billing page — /billing
 *
 * Server Component: reads Stripe redirect query params and passes them to the
 * client boundary. No auth guard needed — the layout handles that.
 */
export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params   = await searchParams;
  const success  = params.success === "true";
  const canceled = params.canceled === "true";
  const plan     = params.plan ?? undefined;

  return (
    <BillingPageClient
      success={success}
      canceled={canceled}
      planParam={plan}
    />
  );
}
