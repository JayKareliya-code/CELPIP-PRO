import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/**
 * Persistent authenticated app layout.
 * Navbar and Footer mount ONCE here and never re-render on
 * navigation between child routes — eliminating the header flicker.
 * Auth guard lives here so individual pages don't need to duplicate it.
 * Sidebar has been removed — all navigation lives in the Navbar.
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
        {children}
      </div>
      <Footer />
    </div>
  );
}
