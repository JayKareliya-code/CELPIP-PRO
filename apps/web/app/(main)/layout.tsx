import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";

/**
 * Persistent authenticated app layout.
 * Navbar, Sidebar, and Footer mount ONCE here and never re-render on
 * navigation between child routes — eliminating the header flicker.
 * Auth guard lives here so individual pages don't need to duplicate it.
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
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-auto">
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
}
