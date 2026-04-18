import { PortalShell } from "@/components/portal/PortalShell";
import { StudentScheduleTermClient } from "@/components/portal/StudentScheduleTermClient";
import { requireRoles } from "@/lib/auth/require-role";

export default async function StudentSchedulePage() {
  const profile = await requireRoles(["student"]);

  const navItems = [
    { label: "Dashboard", href: "/student" },
    { label: "My schedule", href: "/student/schedule" },
    { label: "Announcements", href: "/student/announcements" },
    { label: "Profile", href: "/student/profile" },
    { label: "Campus navigation", href: "/campus-navigation" },
  ];

  return (
    <PortalShell
      userName={profile.name}
      profileImageUrl={profile.profileImageUrl}
      userEmail={profile.email}
      sidebarBadge="Student"
      navItems={navItems}
      periodLabel="Current semester"
    >
      <StudentScheduleTermClient />
    </PortalShell>
  );
}
