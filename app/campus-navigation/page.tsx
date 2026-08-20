import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

function dashboardForRole(role: string): string {
  switch (role) {
    case "student": return "/student";
    case "instructor": return "/faculty";
    case "chairman_admin":
    case "gec_chairman":
    case "cas_admin":
    case "college_admin": return "/chairman";
    case "doi_admin": return "/doi";
    default: return "/";
  }
}

/**
 * Canonical Campus Navigation entrypoint.
 * Redirects with a `from` param so the standalone app's "Back to Opticore" link
 * goes to the correct portal dashboard for the logged-in user.
 */
export default async function CampusNavigationPage() {
  try {
    const profile = await getAuthenticatedProfile();
    const dest = dashboardForRole(profile.role);
    redirect(`/campus-navigation-standalone.html?from=${encodeURIComponent(dest)}`);
  } catch {
    redirect("/campus-navigation-standalone.html");
  }
}