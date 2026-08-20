import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormSection } from "@/components/ins/INSFormSection";
import { LOAD_GENERATOR_NAV_LABEL } from "@/lib/admin-nav";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

export default async function GecInsSectionPage() {
  const profile = await getAuthenticatedProfile();
  const campusWide = !profile.collegeId;

  return (
    <div>
      <ChairmanPageHeader
        title={LOAD_GENERATOR_NAV_LABEL}
        subtitle={
          campusWide
            ? "Section schedule view — campus-wide; switch to Faculty or Room for other groupings (College Admin parity)."
            : "Section schedule view — campus-wide; filter by college and department."
        }
      />
      <INSFormSection insBasePath="/admin/gec/ins" viewerCollegeId={profile.collegeId} campusWide={campusWide} />
    </div>
  );
}
