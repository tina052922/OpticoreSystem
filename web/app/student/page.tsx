import { PortalShell } from "@/components/portal/PortalShell";
import { StudentDashboardTermClient } from "@/components/portal/StudentDashboardTermClient";
import { requireRoles } from "@/lib/auth/require-role";
import { getRecentNotifications } from "@/lib/server/dashboard-data";

export default async function StudentDashboardPage() {
  const profile = await requireRoles(["student"]);
  const notifications = await getRecentNotifications(profile.id);

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
      <StudentDashboardTermClient profileName={profile.name} notifications={notifications} />
    </PortalShell>
  );
}
