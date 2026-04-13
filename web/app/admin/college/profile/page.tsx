import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { AdminProfileCard } from "@/components/admin/AdminProfileCard";
import { ProfileSignatureSectionGate } from "@/components/profile/ProfileSignatureSectionGate";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";
import { collegeDisplayName } from "@/lib/college-labels";
import { adminRoleLabel } from "@/lib/role-labels";

export default async function CollegeAdminProfilePage() {
  const profile = await getAuthenticatedProfile();

  return (
    <div>
      <ChairmanPageHeader title="Profile" subtitle="Account overview — same layout for all OptiCore admin roles." />
      <div className="px-6 pb-8">
        <AdminProfileCard
          fullName={profile.name}
          employeeId={profile.id.slice(0, 8).toUpperCase()}
          roleLabel={adminRoleLabel(profile.role)}
          collegeLine={collegeDisplayName(profile.collegeId)}
          email={profile.email}
          subheading={`${adminRoleLabel(profile.role)} • ${collegeDisplayName(profile.collegeId)}`}
        />
        <ProfileSignatureSectionGate role={profile.role} initialSignatureUrl={profile.signatureImageUrl} />
      </div>
    </div>
  );
}
