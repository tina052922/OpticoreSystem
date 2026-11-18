import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { ChairAssignmentWorkspace } from "@/components/admin/ChairAssignmentWorkspace";

/** College Admin: who chairs each program / major of this college. */
export default function ChairAssignmentPage() {
  return (
    <div>
      <ChairmanPageHeader title="Chairman Assignment" subtitle="Whole program group or per major; transfer when a chair leaves" />
      <ChairAssignmentWorkspace />
    </div>
  );
}
