import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Admin route group layout.
 * Checks for the admin role stored in Clerk's publicMetadata.
 * Non-admin users are redirected to /dashboard.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Role check: set publicMetadata.role = "admin" in Clerk dashboard
  const role = (sessionClaims?.metadata as Record<string, string> | undefined)?.role;
  if (role !== "admin") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
