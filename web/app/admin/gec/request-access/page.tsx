import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { RequestAccessPanel } from "@/components/access/RequestAccessPanel";

export default function GecRequestAccessPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Request access"
        subtitle="Ask College Admin for temporary permission to use Evaluator, INS schedule views, or edit vacant GEC slots."
      />
      <div className="px-8 pb-10 max-w-3xl">
        <RequestAccessPanel variant="full" />
      </div>
    </div>
  );
}
