import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { FacultyOwnProfileDetails } from "@/components/profile/FacultyOwnProfileDetails";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatarUpload";
import { requireRoles } from "@/lib/auth/require-role";

/** Account, personal details the instructor edits, and chairman-kept appointment details. */
export default async function FacultyProfilePage() {
  const profile = await requireRoles(["instructor"]);

  return (
    <div>
      <ChairmanPageHeader title="Profile" subtitle="Your OptiCore instructor account." />
      <div className="px-4 sm:px-6 lg:px-8 pb-10 max-w-2xl space-y-4">
        <ProfileAvatarUpload initialUrl={profile.profileImageUrl} />

        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-black">Account</h2>
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-xs font-medium text-black/50">Name</dt>
              <dd className="mt-0.5 text-sm font-semibold text-black">{profile.name}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-black/50">Email</dt>
              <dd className="mt-0.5 text-sm text-black/85 break-all">{profile.email}</dd>
            </div>
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs font-medium text-black/50">Employee ID</dt>
              <dd className="mt-0.5 text-sm font-semibold text-black tabular-nums">
                {profile.employeeId?.trim() ? profile.employeeId : "—"}
              </dd>
              <p className="mt-1 text-xs text-black/50">
                Matches the ID your chairman entered in Faculty Profile (used for schedule linking).
              </p>
            </div>
          </dl>
        </section>

        <FacultyOwnProfileDetails />
      </div>
    </div>
  );
}
