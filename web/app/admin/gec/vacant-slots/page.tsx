import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { GecVacantSlotsClient } from "./GecVacantSlotsClient";

export default function GecVacantSlotsPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Vacant GEC slots"
        subtitle="Read-only until College Admin approves your request — then edit only vacant GEC cells (never occupied slots or other programs’ schedules)."
      />
      <GecVacantSlotsClient />
    </div>
  );
}
