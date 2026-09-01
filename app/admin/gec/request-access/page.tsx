import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { RequestAccessPanel } from "@/components/access/RequestAccessPanel";

export default function GecRequestAccessPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Request access"
        subtitle="Click a college, then Request Access. One request covers that college."
      />
      <div className="px-8 pb-10 max-w-3xl">
        <RequestAccessPanel variant="full" />
      </div>
    </div>
  );
}
