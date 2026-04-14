import { CampusIntelligenceShell } from "@/components/campus-intelligence/CampusIntelligenceShell";
import { INSTRUCTOR_NAV } from "@/lib/admin-nav";
import { requireRoles } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

/** Shared Campus Intelligence chrome + semester filter for all instructor routes. */
export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRoles(["instructor"]);

  return (
    <CampusIntelligenceShell
      userName={profile.name}
      userEmail={profile.email}
      navItems={INSTRUCTOR_NAV}
      roleLabel="Instructor"
      profileHref="/faculty/profile"
    >
      {children}
    </CampusIntelligenceShell>
  );
}
