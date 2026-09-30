import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { AdminProfileCard } from "@/components/admin/AdminProfileCard";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatarUpload";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";
import { collegeDisplayName } from "@/lib/college-labels";
import { adminRoleLabel } from "@/lib/role-labels";

/**
 * College Admin profile - read only apart from the profile picture.
 *
 * No signature card here: the College Admin e-signature that prints on INS forms is uploaded in
 * System Configuration, where it sits beside the "Prepared by" name it belongs to. A second copy on
 * this page meant two places could disagree about what gets printed.
 */
export default async function CollegeAdminProfilePage() {
  const profile = await getAuthenticatedProfile();

  return (
    <div>
      <ChairmanPageHeader title="Profile" subtitle="Account overview — same layout for all OptiCore admin roles." />
      <div className="px-6 pb-8">
        <div className="mb-6">
          <ProfileAvatarUpload initialUrl={profile.profileImageUrl} />
        </div>
        <AdminProfileCard
          fullName={profile.name ?? ""}
          employeeId={profile.employeeId?.trim() || profile.id.slice(0, 8).toUpperCase()}
          roleLabel={adminRoleLabel(profile.role)}
          collegeLine={collegeDisplayName(profile.collegeId ?? null)}
          email={profile.email}
          subheading={`${adminRoleLabel(profile.role)} • ${collegeDisplayName(profile.collegeId ?? null)}`}
          showEditProfile={false}
          showChangePassword={false}
        />
      </div>
    </div>
  );
}
