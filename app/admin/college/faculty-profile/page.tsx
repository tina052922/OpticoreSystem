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
      {/* The CAS Admin also sees the Service Chairs (they belong to CAS). */}
      <FacultyProfileWithScope
        lockedCollegeId={profile.collegeId}
        excludeGecFaculty
        includeServiceChairs={Boolean(profile.casAdmin)}
      />
    </div>
  );
}
