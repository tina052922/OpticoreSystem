import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";
import { getDefaultHomeForRole } from "@/lib/auth/role-home";

/**
 * Canonical Campus Navigation entrypoint.
 * Redirects with a `from` param so the standalone app's "Back to Opticore" link
 * goes to the correct portal dashboard for the logged-in user.
 */
export default async function CampusNavigationPage() {
  try {
    const profile = await getAuthenticatedProfile();
    const dest = getDefaultHomeForRole(profile.role);
    redirect(`/campus-navigation-standalone.html?from=${encodeURIComponent(dest)}`);
  } catch {
    redirect("/campus-navigation-standalone.html");
  }
}
