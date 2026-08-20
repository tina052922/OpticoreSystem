import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { FacultyProfileWithScope } from "@/components/faculty/FacultyProfileWithScope";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

export default async function CollegeFacultyProfilePage() {
  const profile = await getAuthenticatedProfile();

  return (
    <div>
      <ChairmanPageHeader
        title="Faculty Profile"
        subtitle="Filter by college and department"
      />
      <FacultyProfileWithScope initialCollegeId={profile.collegeId} />
    </div>
  );
}
