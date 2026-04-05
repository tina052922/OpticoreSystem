import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { FacultyProfileWithScope } from "@/components/faculty/FacultyProfileWithScope";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

export default async function CollegeFacultyProfilePage() {
  const profile = await getAuthenticatedProfile();

  return (
    <div>
      <ChairmanPageHeader
        title="Faculty Profile"
        subtitle="Campus-wide directory — filter by college and department (program)."
      />
      <FacultyProfileWithScope initialCollegeId={profile.collegeId} />
    </div>
  );
}
