import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormRoom } from "@/components/ins/INSFormRoom";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

export default async function CollegeInsRoomPage() {
  const profile = await getAuthenticatedProfile();

  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle="Room schedule view — campus-wide; filter by college and department."
      />
      <INSFormRoom insBasePath="/admin/college/ins" viewerCollegeId={profile.collegeId} />
    </div>
  );
}
