import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { AccessRequestsReview } from "@/components/access/AccessRequestsReview";

export default function CollegeAccessRequestsPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Access requests"
        subtitle="Review scoped requests from GEC Chairman and CAS Admin. Approve to grant temporary access to Evaluator, INS views, or vacant GEC slot editing."
      />
      <div className="px-8 pb-10 max-w-6xl">
        <AccessRequestsReview />
      </div>
    </div>
  );
}
