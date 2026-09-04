import { PortalShell } from "@/components/portal/PortalShell";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatarUpload";
import { STUDENT_PORTAL_NAV } from "@/lib/admin-nav";
import { requireRoles } from "@/lib/auth/require-role";
import { API_BASE_URL } from "@/lib/api/client";

async function fetchStudentProfileData(userId: string) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/catalog/student-profile?userId=${encodeURIComponent(userId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const j = await res.json();
    return j.data as {
      programName: string | null;
      sectionName: string | null;
      yearLevel: number;
    } | null;
  } catch {
    return null;
  }
}

export default async function StudentProfilePage() {
  const profile = await requireRoles(["student"]);

  const studentProfile = profile.studentProfile as
    | { programId?: string; sectionId?: string; yearLevel?: number }
    | null
    | undefined;

  const profileData = profile.id ? await fetchStudentProfileData(profile.id) : null;

  return (
    <PortalShell
      userName={profile.name ?? ""}
      profileImageUrl={profile.profileImageUrl}
      userEmail={profile.email}
      sidebarBadge="Student"
      navItems={STUDENT_PORTAL_NAV}
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
          <div>
            <dt className="text-black/50 font-medium">Student ID</dt>
            <dd className="font-semibold text-black tabular-nums">
              {profile.employeeId?.trim() ? profile.employeeId : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-black/50 font-medium">Program</dt>
            <dd className="font-semibold text-black">
              {profileData?.programName ?? (studentProfile?.programId ? "(loading)" : "—")}
            </dd>
          </div>
          <div>
            <dt className="text-black/50 font-medium">Section</dt>
            <dd className="font-semibold text-black">
              {profileData?.sectionName ?? (studentProfile?.sectionId ? "(loading)" : "—")}
            </dd>
          </div>
          <div>
            <dt className="text-black/50 font-medium">Year level</dt>
            <dd className="font-semibold text-black tabular-nums">
              {profileData?.yearLevel ?? studentProfile?.yearLevel ?? "—"}
            </dd>
          </div>
        </dl>
        <a
          href="/account/change-password?next=/student"
          className="inline-flex text-sm font-semibold text-[#780301] hover:underline"
        >
          Change password
        </a>
      </div>
    </PortalShell>
  );
}
