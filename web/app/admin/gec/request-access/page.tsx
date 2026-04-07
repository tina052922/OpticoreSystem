import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { RequestAccessPanel } from "@/components/access/RequestAccessPanel";

export default function GecRequestAccessPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Request approval for vacant slots"
        subtitle="GEC Chairman: College Admin must approve before you can edit vacant GEC slots. You may also request Central Hub Evaluator or INS scope — all routed to College Admin for review."
      />
      <div className="px-8 pb-10 max-w-3xl">
        <RequestAccessPanel variant="full" />
      </div>
    </div>
  );
}
