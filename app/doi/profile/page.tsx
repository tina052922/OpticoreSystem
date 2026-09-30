import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { AdminProfileCard } from "@/components/admin/AdminProfileCard";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatarUpload";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";
import { collegeDisplayName } from "@/lib/college-labels";
import { adminRoleLabel } from "@/lib/role-labels";

/**
 * DOI profile.
 *
 * No signature cards here. The DOI e-signature and the Campus Director signature are campus-wide
 * settings that print on every INS form, so they live in System Configuration with the other
 * signatories — having a second copy on this page meant two places could disagree about what gets
 * printed.
 */
export default async function DoiProfilePage() {
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
          storedEmployeeId={profile.employeeId ?? ""}
          roleLabel={adminRoleLabel(profile.role)}
          collegeLine={collegeDisplayName(profile.collegeId ?? null)}
          email={profile.email}
          subheading={`${adminRoleLabel(profile.role)} • ${collegeDisplayName(profile.collegeId ?? null)}`}
          editable
          showChangePassword={false}
        />
      </div>
    </div>
  );
}
