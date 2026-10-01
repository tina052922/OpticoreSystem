import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { FacultyProfileWithScope } from "@/components/faculty/FacultyProfileWithScope";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

export default async function CollegeFacultyProfilePage() {
  const profile = await getAuthenticatedProfile();

  return (
    <div>
      <ChairmanPageHeader
        title="Faculty Profile"
        subtitle="Faculty in your college — filter by department"
      />
      {/* College Admin sees only their own college. */}
      <FacultyProfileWithScope lockedCollegeId={profile.collegeId} excludeGecFaculty />
    </div>
  );
}
