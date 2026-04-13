import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormFaculty } from "@/components/ins/INSFormFaculty";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

/** Same INS Form 5A behavior as College Admin when the profile has a college; otherwise campus-wide. */
export default async function GecInsFacultyPage() {
  const profile = await getAuthenticatedProfile();
  const campusWide = !profile.collegeId;

  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle={
          campusWide
            ? "Schedule view — campus-wide; use Faculty / Section / Room tabs to group schedules like College Admin."
            : "Schedule view — campus-wide scope; narrow by college and department using the search bar above."
        }
      />
      <INSFormFaculty insBasePath="/admin/gec/ins" viewerCollegeId={profile.collegeId} campusWide={campusWide} />
    </div>
  );
}
