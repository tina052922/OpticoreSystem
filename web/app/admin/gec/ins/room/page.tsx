import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormRoom } from "@/components/ins/INSFormRoom";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

export default async function GecInsRoomPage() {
  const profile = await getAuthenticatedProfile();
  const campusWide = !profile.collegeId;

  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle={
          campusWide
            ? "Room schedule view — campus-wide; use tabs to open Faculty or Section schedules (College Admin parity)."
            : "Room schedule view — campus-wide; filter by college and department."
        }
      />
      <INSFormRoom insBasePath="/admin/gec/ins" viewerCollegeId={profile.collegeId} campusWide={campusWide} />
    </div>
  );
}
