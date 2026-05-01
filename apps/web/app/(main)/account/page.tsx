import { redirect } from "next/navigation";

/**
 * /account is superseded by /settings.
 * Hard-redirect any legacy bookmarks or links.
 */
export default function AccountPage() {
  redirect("/settings");
}
