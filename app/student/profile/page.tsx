import { cookies } from "next/headers";
import { AdminProfileCard } from "@/components/admin/AdminProfileCard";
import { PortalShell } from "@/components/portal/PortalShell";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatarUpload";
import { STUDENT_PORTAL_NAV } from "@/lib/admin-nav";
import { requireRoles } from "@/lib/auth/require-role";
import { API_BASE_URL } from "@/lib/api/client";

type StudentEnrolment = {
  programName: string | null;
  sectionName: string | null;
  yearLevel: number | null;
};

/**
 * The student's programme, section and year, read through the API.
 *
 * The request carries the signed-in cookies. Without them `/api/catalog/student-profile` answers 401
 * — it is behind `verifySupabaseToken` — and this returned null, which the page used to render as
 * the word "(loading)". Nothing was loading: the call had already failed, and the label sat there
 * for good.
 */
async function fetchStudentEnrolment(userId: string): Promise<StudentEnrolment | null> {
  try {
    const store = await cookies();
    const cookieHeader = store
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    const res = await fetch(
      `${API_BASE_URL}/api/catalog/student-profile?userId=${encodeURIComponent(userId)}`,
      { cache: "no-store", headers: cookieHeader ? { cookie: cookieHeader } : undefined },
    );
    if (!res.ok) return null;
    const body = await res.json();
    const data = body?.data;
    if (!data) return null;
    return {
      programName: data.programName ?? null,
      sectionName: data.sectionName ?? null,
      yearLevel: typeof data.yearLevel === "number" ? data.yearLevel : null,
    };
  } catch {
    return null;
  }
}

/** Year levels read as ordinals on a student's own record, not as bare digits. */
function yearLevelLabel(yearLevel: number | null): string {
  if (!yearLevel || yearLevel < 1) return "—";
  const names = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "6th year"];
  return names[yearLevel - 1] ?? `Year ${yearLevel}`;
}

export default async function StudentProfilePage() {
  const profile = await requireRoles(["student"]);

  const studentProfile = profile.studentProfile as
    | { programId?: string; sectionId?: string; yearLevel?: number }
    | null
    | undefined;

  const enrolment = profile.id ? await fetchStudentEnrolment(profile.id) : null;

  /**
   * "Not on file" rather than "(loading)".
   *
   * A student with no section recorded yet is a real state the registrar has to fix, and saying so
   * is more use than a placeholder that never resolves.
   */
  const unknown = (hasId: boolean) => (hasId ? "Not on file" : "—");
  const programName = enrolment?.programName ?? unknown(Boolean(studentProfile?.programId));
  const sectionName = enrolment?.sectionName ?? unknown(Boolean(studentProfile?.sectionId));
  const yearLevel = yearLevelLabel(enrolment?.yearLevel ?? studentProfile?.yearLevel ?? null);

  return (
    <PortalShell
      userName={profile.name ?? ""}
      profileImageUrl={profile.profileImageUrl}
      userEmail={profile.email}
      sidebarBadge="Student"
      navItems={STUDENT_PORTAL_NAV}
      periodLabel="Current semester"
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-[960px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Profile</h1>
          <p className="text-gray-600 text-sm mt-1">
            Your account details and enrolment. Changing your email asks you to confirm a code sent to the new
            address.
          </p>
        </div>

        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-4">Profile photo</h2>
          <ProfileAvatarUpload initialUrl={profile.profileImageUrl} />
        </section>

        <AdminProfileCard
          fullName={profile.name ?? ""}
          employeeId={profile.employeeId}
          storedEmployeeId={profile.employeeId}
          idLabel="Student ID"
          // The registrar issues it and enrolment is matched on it.
          allowIdEdit={false}
          roleLabel="Student"
          collegeLine={programName}
          email={profile.email ?? ""}
          subheading={`${programName} · ${sectionName}`}
          editable
          // Students sign in with the password they set at registration; there is no reset here.
          showChangePassword={false}
          extraRows={[
            { label: "Program", value: programName },
            { label: "Section", value: sectionName },
            { label: "Year level", value: yearLevel },
          ]}
        />
      </div>
    </PortalShell>
  );
}
