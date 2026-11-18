import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { ChairAssignmentWorkspace } from "@/components/admin/ChairAssignmentWorkspace";
import { CollegeChairAssignmentTabs } from "@/components/admin/CollegeChairAssignmentTabs";
import { requireRoles } from "@/lib/auth/require-role";

/** College Admin: who chairs each program / major of this college. CAS Admin: plus CAS Chairs. */
export default async function ChairAssignmentPage() {
  const profile = await requireRoles(["college_admin"]);
  return (
    <div>
      <ChairmanPageHeader title="Chairman Assignment" subtitle="Whole program group or per major; transfer when a chair leaves" />
      {profile.casAdmin && profile.collegeId ? (
        <CollegeChairAssignmentTabs collegeId={profile.collegeId} />
      ) : (
        <ChairAssignmentWorkspace />
      )}
    </div>
  );
}
