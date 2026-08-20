import { redirect } from "next/navigation";
import { PublicLandingPage } from "@/components/landing/PublicLandingPage";
import { getOptionalProfile } from "@/lib/auth/require-role";

function dashboardForRole(role: string): string | null {
  switch (role) {
    case "student": return "/student";
    case "instructor": return "/faculty";
    case "chairman_admin":
    case "gec_chairman":
    case "cas_admin":
    case "college_admin": return "/chairman";
    case "doi_admin": return "/doi";
    default: return null;
  }
}

/** Public landing — shown to all users, redirects dashboard if session exists. */
export default async function Home() {
  const profile = await getOptionalProfile();
  if (profile) {
    const dest = dashboardForRole(profile.role);
    if (dest) {
      redirect(dest);
    }
  }

  return <PublicLandingPage />;
}
