import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { SubjectCodesWithScope } from "@/components/subjects/SubjectCodesWithScope";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

export default async function CollegeSubjectCodesPage() {
  const profile = await getAuthenticatedProfile();

  return (
    <div>
      <ChairmanPageHeader
        title="Subject Codes"
        subtitle="Subjects in your college — filter by department"
      />
      {/* College Admin sees only their own college. */}
      <SubjectCodesWithScope lockedCollegeId={profile.collegeId} />
    </div>
  );
}
