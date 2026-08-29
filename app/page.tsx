import { redirect } from "next/navigation";
import { PublicLandingPage } from "@/components/landing/PublicLandingPage";
import { getOptionalProfile } from "@/lib/auth/require-role";
import { getDefaultHomeForRole } from "@/lib/auth/role-home";

/** Public landing — shown to all users, redirects dashboard if session exists. */
export default async function Home() {
  const profile = await getOptionalProfile();
  if (profile) {
    const dest = getDefaultHomeForRole(profile.role);
    if (dest && dest !== "/login") {
      redirect(dest);
    }
  }

  return <PublicLandingPage />;
}
