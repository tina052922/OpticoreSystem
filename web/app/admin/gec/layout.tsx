import { CampusIntelligenceShell } from "@/components/campus-intelligence/CampusIntelligenceShell";
import { GEC_CHAIRMAN_NAV } from "@/lib/admin-nav";
import { requireRoles } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function GecChairmanLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRoles(["gec_chairman"]);

  return (
    <CampusIntelligenceShell
      userName={profile.name}
      userEmail={profile.email}
      navItems={GEC_CHAIRMAN_NAV}
      roleLabel="GEC chairman"
      profileHref="/admin/gec/profile"
      inboxHref="/admin/gec/inbox"
    >
      {children}
    </CampusIntelligenceShell>
  );
}
