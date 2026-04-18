import { PortalShell } from "@/components/portal/PortalShell";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatarUpload";
import { requireRoles } from "@/lib/auth/require-role";

export default async function StudentProfilePage() {
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
      <div className="p-4 sm:p-6 lg:p-8 max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
          <p className="text-sm text-black/60 mt-1">Your student account and profile photo (shown in the header).</p>
        </div>
        <ProfileAvatarUpload initialUrl={profile.profileImageUrl} />
        <dl className="rounded-xl border border-black/10 bg-white p-5 text-sm space-y-3 shadow-sm">
          <div>
            <dt className="text-black/50 font-medium">Name</dt>
            <dd className="font-semibold text-black">{profile.name}</dd>
          </div>
          <div>
            <dt className="text-black/50 font-medium">Email</dt>
            <dd className="text-black/85 break-all">{profile.email}</dd>
          </div>
        </dl>
      </div>
    </PortalShell>
  );
}
