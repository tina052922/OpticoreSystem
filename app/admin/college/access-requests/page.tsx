import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { AccessRequestsReview } from "@/components/access/AccessRequestsReview";

export default function CollegeAccessRequestsPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Access requests"
        subtitle="Peer-college Evaluator access only. GEC Chairman plots vacant GEC slots without this queue."
      />
      <div className="px-8 pb-10 max-w-6xl">
        <AccessRequestsReview />
      </div>
    </div>
  );
}
