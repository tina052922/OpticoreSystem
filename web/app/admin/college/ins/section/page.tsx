import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormSection } from "@/components/ins/INSFormSection";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

export default async function CollegeInsSectionPage() {
  const profile = await getAuthenticatedProfile();

  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle="Section schedule view — campus-wide; filter by college and department."
      />
      <INSFormSection insBasePath="/admin/college/ins" viewerCollegeId={profile.collegeId} />
    </div>
  );
}
