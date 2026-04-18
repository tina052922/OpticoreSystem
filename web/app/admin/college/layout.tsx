import { CampusIntelligenceShell } from "@/components/campus-intelligence/CampusIntelligenceShell";
import { COLLEGE_ADMIN_NAV } from "@/lib/admin-nav";
import { requireRoles } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function CollegeAdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRoles(["college_admin"]);

  return (
    <CampusIntelligenceShell
      userName={profile.name}
      profileImageUrl={profile.profileImageUrl}
      userEmail={profile.email}
      navItems={COLLEGE_ADMIN_NAV}
      roleLabel="College admin · CTE"
      profileHref="/admin/college/profile"
    >
      {children}
    </CampusIntelligenceShell>
  );
}
