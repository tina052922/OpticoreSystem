import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormFaculty } from "@/components/ins/INSFormFaculty";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

export default async function CollegeInsFacultyPage() {
  const profile = await getAuthenticatedProfile();

  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle="Schedule view — campus-wide scope; narrow by college and department using the search bar above."
      />
      <INSFormFaculty insBasePath="/admin/college/ins" viewerCollegeId={profile.collegeId} />
    </div>
  );
}
