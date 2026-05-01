import { redirect } from "next/navigation";
import { CampusIntelligenceShell } from "@/components/campus-intelligence/CampusIntelligenceShell";
import { DOI_ADMIN_NAV } from "@/lib/admin-nav";
import { getDoiSession } from "@/lib/auth/doi-session";

export const dynamic = "force-dynamic";

export default async function DoiLayout({ children }: { children: React.ReactNode }) {
  const session = await getDoiSession();
  if (!session) {
    redirect("/login?next=/doi/dashboard&error=forbidden_doi");
  }

  return (
    <CampusIntelligenceShell
      userName={session.name}
      profileImageUrl={session.profileImageUrl}
      userEmail={session.email}
      navItems={DOI_ADMIN_NAV}
      roleLabel="DOI · VPAA"
      profileHref="/doi/profile"
      policyReviewsBadge
      auditLogUnreadScope="doi"
    >
      {children}
    </CampusIntelligenceShell>
  );
}
