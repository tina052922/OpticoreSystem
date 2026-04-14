import { PortalShell } from "@/components/portal/PortalShell";
import { FacultyDashboardTermClient } from "@/components/portal/FacultyDashboardTermClient";
import { requireRoles } from "@/lib/auth/require-role";

export default async function FacultyDashboardPage() {
  const profile = await requireRoles(["instructor"]);

  const navItems = [
    { label: "Dashboard", href: "/faculty" },
    { label: "INS Form (by faculty)", href: "/faculty/ins/faculty" },
    { label: "My schedule", href: "/faculty/schedule" },
    { label: "Request change", href: "/faculty/request-change" },
    { label: "Announcements", href: "/faculty/announcements" },
    { label: "Campus navigation", href: "/campus-navigation" },
  ];

  return (
    <PortalShell
      userName={profile.name}
      userEmail={profile.email}
      sidebarBadge="Faculty"
      navItems={navItems}
      periodLabel="Current semester"
    >
      <FacultyDashboardTermClient profileName={profile.name} />
    </PortalShell>
  );
}
