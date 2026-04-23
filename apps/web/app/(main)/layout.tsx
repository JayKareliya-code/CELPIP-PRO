import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { TosGateWrapper } from "@/components/common/TosGateWrapper";

/**
 * Persistent authenticated app layout.
 * Navbar and Footer mount ONCE here and never re-render on
 * navigation between child routes — eliminating the header flicker.
 * Auth guard lives here so individual pages don't need to duplicate it.
 * Sidebar has been removed — all navigation lives in the Navbar.
 *
 * TosGateWrapper renders a non-dismissable overlay whenever the current
 * user has not yet accepted the latest Terms of Service version.
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
      <div className="flex flex-col flex-1 overflow-auto">
        {/* TosGateWrapper is a client component — it reads the current user
            from React Query and shows the TOS modal when required. */}
        <TosGateWrapper>
          {children}
        </TosGateWrapper>
      </div>
      <Footer />
    </div>
  );
}
