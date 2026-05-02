import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { RequestAccessPanel } from "@/components/access/RequestAccessPanel";

export default function GecRequestAccessPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Request access"
        subtitle="Submit one request per college. Optional scopes: Evaluator, INS, vacant GEC slots."
      />
      <div className="px-8 pb-10 max-w-3xl">
        <RequestAccessPanel variant="full" />
      </div>
    </div>
  );
}
