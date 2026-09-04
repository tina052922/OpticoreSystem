import { CampusIntelligenceShell } from "@/components/campus-intelligence/CampusIntelligenceShell";
import { DOI_ADMIN_NAV } from "@/lib/admin-nav";
import { getDoiSession } from "@/lib/auth/doi-session";

export const dynamic = "force-dynamic";

export default async function DoiLayout({ children }: { children: React.ReactNode }) {
  const session = await getDoiSession();

  return (
    <CampusIntelligenceShell
      userName={session.name}
      profileImageUrl={session.profileImageUrl}
      userEmail={session.email}
      navItems={DOI_ADMIN_NAV}
      roleLabel="DOI · VPAA"
      profileHref="/doi/profile"
      settingsHref="/doi/system-configuration"
      auditLogUnreadScope="doi"
    >
      {children}
    </CampusIntelligenceShell>
  );
}
