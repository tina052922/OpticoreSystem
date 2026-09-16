import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { AcademicStructureWorkspace } from "@/components/admin/AcademicStructureWorkspace";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

export default async function CollegeAcademicStructurePage() {
  const profile = await getAuthenticatedProfile();

  return (
    <div>
      <ChairmanPageHeader
        title="Programs & Sections"
        subtitle="Programs, years, and sections for your college"
      />
      <AcademicStructureWorkspace lockedCollegeId={profile.collegeId} canManageColleges={false} />
    </div>
  );
}
