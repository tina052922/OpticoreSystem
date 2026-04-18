import { CampusIntelligenceShell } from "@/components/campus-intelligence/CampusIntelligenceShell";
import { CAS_ADMIN_NAV } from "@/lib/admin-nav";
import { requireRoles } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function CasAdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRoles(["cas_admin"]);

  return (
    <CampusIntelligenceShell
      userName={profile.name}
      profileImageUrl={profile.profileImageUrl}
      userEmail={profile.email}
      navItems={CAS_ADMIN_NAV}
      roleLabel="CAS admin"
      profileHref="/admin/cas/profile"
      inboxHref="/admin/cas/inbox"
    >
      {children}
    </CampusIntelligenceShell>
  );
}
