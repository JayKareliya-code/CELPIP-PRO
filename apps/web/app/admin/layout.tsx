import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Admin route group layout.
 *
 * Uses currentUser() to read publicMetadata — sessionClaims alone does NOT
 * include publicMetadata in Clerk's default JWT template.
 *
 * To grant admin access: set publicMetadata.role = "admin" in Clerk dashboard
 * → Users → [user] → Metadata → Public metadata: { "role": "admin" }
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const role = user?.publicMetadata?.role as string | undefined;

  if (role !== "admin") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
