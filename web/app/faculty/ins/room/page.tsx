import { INSFormRoom } from "@/components/ins/INSFormRoom";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireRoles } from "@/lib/auth/require-role";

export default async function FacultyInsRoomPage() {
  const profile = await requireRoles(["instructor"]);
  const navItems = [
    { label: "Dashboard", href: "/faculty" },
    { label: "INS Form (by faculty)", href: "/faculty/ins/faculty" },
    { label: "INS Section", href: "/faculty/ins/section" },
    { label: "INS Room", href: "/faculty/ins/room" },
    { label: "My schedule", href: "/faculty/schedule" },
    { label: "Request change", href: "/faculty/request-change" },
    { label: "Announcements", href: "/faculty/announcements" },
    { label: "Campus navigation", href: "/campus-navigation" },
  ];

  return (
    <PortalShell userName={profile.name} userEmail={profile.email} sidebarBadge="Faculty" navItems={navItems}>
      <INSFormRoom insBasePath="/faculty/ins" viewerCollegeId={profile.collegeId} />
    </PortalShell>
  );
}
