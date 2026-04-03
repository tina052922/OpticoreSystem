import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { GecVacantSlotsClient } from "./GecVacantSlotsClient";

export default function GecVacantSlotsPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Vacant GEC slots"
        subtitle="Assign instructor, room, and time only into vacant GEC cells. Non-GEC rows are read-only."
      />
      <GecVacantSlotsClient />
    </div>
  );
}
