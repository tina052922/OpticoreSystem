import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { SubjectCodesWithScope } from "@/components/subjects/SubjectCodesWithScope";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

export default async function CollegeSubjectCodesPage() {
  const profile = await getAuthenticatedProfile();

  return (
    <div>
      <ChairmanPageHeader
        title="Subject Codes"
        subtitle="Filter by college and department"
      />
      <SubjectCodesWithScope initialCollegeId={profile.collegeId} />
    </div>
  );
}
