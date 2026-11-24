import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { ChairAssignmentWorkspace } from "@/components/admin/ChairAssignmentWorkspace";
import { requireRoles } from "@/lib/auth/require-role";

/**
 * College Admin: who chairs each program / major of this college. The CAS Admin gets the same page
 * (no separate "CAS Chairs" tab): Service Chairs and service areas are managed by DOI under
 * College Admins & Chairpersons → CAS Chairs.
 */
export default async function ChairAssignmentPage() {
  await requireRoles(["college_admin"]);
  return (
    <div>
      <ChairmanPageHeader title="Chairperson Assignment" subtitle="Whole program group or per major; transfer when a chair leaves" />
      {/* A College Admin creates and edits their own college's Program Chairpersons (server-scoped). */}
      <ChairAssignmentWorkspace canManageAccounts />
    </div>
  );
}
