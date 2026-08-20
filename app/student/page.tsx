import { PortalShell } from "@/components/portal/PortalShell";
import { StudentDashboardTermClient } from "@/components/portal/StudentDashboardTermClient";
import { requireRoles } from "@/lib/auth/require-role";

export default async function StudentDashboardPage() {
  const profile = await requireRoles(["student"]);

  const navItems = [
    { label: "Dashboard", href: "/student" },
    { label: "My schedule", href: "/student/schedule" },
    { label: "Profile", href: "/student/profile" },
    { label: "Campus navigation", href: "/campus-navigation" },
  ];

  return (
    <PortalShell
      userName={profile.name ?? ""}
      profileImageUrl={profile.profileImageUrl}
      userEmail={profile.email}
      sidebarBadge="Student"
      navItems={navItems}
      periodLabel="Current semester"
    >
      <StudentDashboardTermClient profileName={profile.name ?? ""} />
    </PortalShell>
  );
}
