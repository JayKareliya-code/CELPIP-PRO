import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { TosGateWrapper } from "@/components/common/TosGateWrapper";
import { GlobalCartProvider } from "@/components/billing/GlobalCartProvider";

/**
 * Persistent authenticated app layout.
 * Navbar and Footer mount ONCE here — no re-render on route changes.
 * Auth guard lives here so individual pages don't need to duplicate it.
 *
 * GlobalCartProvider mounts CartFAB + BillingCartDrawer once globally,
 * so any page/component can call addItem() and the "View Cart" FAB
 * appears automatically without per-page wiring.
 */
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-col flex-1">
        {/* TosGateWrapper shows a non-dismissable TOS overlay when required. */}
        <TosGateWrapper>
          <GlobalCartProvider>
            {children}
          </GlobalCartProvider>
        </TosGateWrapper>
      </div>
      <Footer />
    </div>
  );
}
