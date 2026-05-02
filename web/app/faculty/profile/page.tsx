import Link from "next/link";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatarUpload";
import { requireRoles } from "@/lib/auth/require-role";

/** Account summary + quick link to password (shell provides global nav). */
export default async function FacultyProfilePage() {
  const profile = await requireRoles(["instructor"]);

  return (
    <div>
      <ChairmanPageHeader title="Profile" subtitle="Your OptiCore instructor account." />
      <div className="px-4 sm:px-6 lg:px-8 pb-10 max-w-lg space-y-4">
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
            <dt className="text-black/50 font-medium">Employee ID</dt>
            <dd className="font-semibold text-black tabular-nums">
              {profile.employeeId?.trim() ? profile.employeeId : "—"}
            </dd>
            <p className="text-xs text-black/50 mt-1">
              Matches the ID your chairman entered in Faculty Profile (used for schedule linking).
            </p>
          </div>
        </dl>
        <Link
          href="/account/change-password?next=/faculty/ins%3Ftab%3Dfaculty"
          className="inline-flex text-sm font-semibold text-[#780301] hover:underline"
        >
          Change password
        </Link>
      </div>
    </div>
  );
}
