import { CampusIntelligenceShell } from "@/components/campus-intelligence/CampusIntelligenceShell";
import { CHAIRMAN_NAV } from "@/lib/admin-nav";
import { getChairmanSession } from "@/lib/auth/chairman-session";

export const dynamic = "force-dynamic";

export default async function ChairmanLayout({ children }: { children: React.ReactNode }) {
  const session = await getChairmanSession();

  return (
    <CampusIntelligenceShell
      userName={session.name ?? undefined}
      profileImageUrl={session.profileImageUrl}
      userEmail={session.email}
      navItems={CHAIRMAN_NAV}
      roleLabel="Chairman admin · COTE"
      profileHref="/chairman/profile"
      scheduleChangeRequestsBadgeCollegeId={session.collegeId}
      scheduleChangeRequestsBadgeProgramId={session.programId}
      instructorRequestsBadge
    >
      {children}
    </CampusIntelligenceShell>
  );
}
