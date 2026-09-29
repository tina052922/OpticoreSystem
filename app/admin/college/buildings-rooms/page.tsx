import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { BuildingsRoomsWithScope } from "@/components/admin/BuildingsRoomsWithScope";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

export default async function CollegeBuildingsRoomsPage() {
  const profile = await getAuthenticatedProfile();

  return (
    <div>
      <ChairmanPageHeader
        title="Buildings & Rooms"
        subtitle="Department-scoped facilities for Evaluator and GEC plotting"
      />
      {/* College Admin sees only their own college. */}
      <BuildingsRoomsWithScope lockedCollegeId={profile.collegeId} />
    </div>
  );
}
