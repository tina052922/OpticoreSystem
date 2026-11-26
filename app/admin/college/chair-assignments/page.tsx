import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { ChairAssignmentWorkspace } from "@/components/admin/ChairAssignmentWorkspace";
import { CollegeCasChairsTab } from "@/components/admin/CollegeCasChairsTab";
import { requireRoles } from "@/lib/auth/require-role";

/**
 * College Admin: who chairs each program / major of this college. The CAS Admin also adds and edits
 * the Service Chairs (and their service areas) here, below the Program Chairs — one page, no tabs.
 */
export default async function ChairAssignmentPage() {
  const profile = await requireRoles(["college_admin"]);
  return (
    <div>
      <ChairmanPageHeader title="Chairperson Assignment" subtitle="Whole program group or per major; transfer when a chair leaves" />
      {/* A College Admin creates and edits their own college's Program Chairpersons (server-scoped). */}
      <ChairAssignmentWorkspace canManageAccounts />
      {profile.casAdmin && profile.collegeId ? (
        <section className="px-4 sm:px-6 lg:px-8 pb-10 pt-2 max-w-[1400px] space-y-3">
          <h2 className="text-[18px] font-bold text-black/85">Service Chairs</h2>
          <CollegeCasChairsTab collegeId={profile.collegeId} serviceChairsOnly />
        </section>
      ) : null}
    </div>
  );
}
