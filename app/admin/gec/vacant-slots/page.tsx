import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { GecVacantSlotsClient } from "./GecVacantSlotsClient";

export default function GecVacantSlotsPage() {
  return (
    <div>
      <ChairmanPageHeader title="Vacant GEC slots" subtitle="Use Central Hub Evaluator; access is approved per college." />
      <GecVacantSlotsClient />
    </div>
  );
}
