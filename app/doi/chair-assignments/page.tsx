import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { ChairAssignmentWorkspace } from "@/components/admin/ChairAssignmentWorkspace";

/** DOI: chairman assignment for any college. */
export default function DoiChairAssignmentPage() {
  return (
    <div>
      <ChairmanPageHeader title="Chairman Assignment" subtitle="Whole program group or per major; transfer when a chair leaves" />
      <ChairAssignmentWorkspace campusWide />
    </div>
  );
}
