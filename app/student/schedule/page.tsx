import { PortalShell } from "@/components/portal/PortalShell";
import { StudentScheduleTermClient } from "@/components/portal/StudentScheduleTermClient";
import { STUDENT_PORTAL_NAV } from "@/lib/admin-nav";
import { requireRoles } from "@/lib/auth/require-role";

export default async function StudentSchedulePage() {
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
      <StudentScheduleTermClient />
    </PortalShell>
  );
}
