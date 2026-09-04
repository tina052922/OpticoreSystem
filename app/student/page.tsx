import { PortalShell } from "@/components/portal/PortalShell";
import { StudentDashboardTermClient } from "@/components/portal/StudentDashboardTermClient";
import { STUDENT_PORTAL_NAV } from "@/lib/admin-nav";
import { requireRoles } from "@/lib/auth/require-role";

export default async function StudentDashboardPage() {
  const profile = await requireRoles(["student"]);

  return (
    <PortalShell
      userName={profile.name ?? ""}
      profileImageUrl={profile.profileImageUrl}
      userEmail={profile.email}
      sidebarBadge="Student"
      navItems={STUDENT_PORTAL_NAV}
      periodLabel="Current semester"
    >
      <StudentDashboardTermClient profileName={profile.name ?? ""} />
    </PortalShell>
  );
}
