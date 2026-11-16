import { PortalShell } from "@/components/portal/PortalShell";
import { StudentRoomInsClient } from "@/components/portal/StudentRoomInsClient";
import { STUDENT_PORTAL_NAV } from "@/lib/admin-nav";
import { requireRoles } from "@/lib/auth/require-role";

/**
 * Student INS Forms Generator — By room (Form 5C).
 *
 * A student's own section schedule (Form 5B) stays under My schedule; this page answers "what is in
 * that room this term". Old `?tab=section` links land here too and simply show the room view.
 */
export default async function StudentInsPage() {
  const profile = await requireRoles(["student"]);

  return (
    <PortalShell
      userName={profile.name ?? ""}
      profileImageUrl={profile.profileImageUrl}
      userEmail={profile.email}
      sidebarBadge="Student"
      studentSectionPrompt
      navItems={STUDENT_PORTAL_NAV}
      periodLabel="Current semester"
    >
      <StudentRoomInsClient />
    </PortalShell>
  );
}
