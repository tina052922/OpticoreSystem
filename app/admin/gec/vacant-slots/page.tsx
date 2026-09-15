import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { GecVacantSlotsClient } from "./GecVacantSlotsClient";

export default function GecVacantSlotsPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Vacant GEC slots"
        subtitle="Use Central Hub Evaluator — plot vacant GEC in the selected college or department (no access request)."
      />
      <GecVacantSlotsClient />
    </div>
  );
}
