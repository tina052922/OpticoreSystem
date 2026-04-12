import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { RequestAccessPanel } from "@/components/access/RequestAccessPanel";

export default function GecRequestAccessPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Request Approval to Edit Vacant GEC Slots"
        subtitle="GEC Chairman: College Admin approves once per grant window. After approval you can edit every vacant GEC slot from the Central Hub Evaluator without requesting per row. Optional scopes (Evaluator, INS) route to the same approver."
      />
      <div className="px-8 pb-10 max-w-3xl">
        <RequestAccessPanel variant="full" />
      </div>
    </div>
  );
}
