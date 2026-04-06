import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { DoiInsFacultyInsView } from "./DoiInsFacultyInsView";

export default function DoiInsFacultyPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="INS Form (Program by Teacher)"
        subtitle="Campus-wide master schedule — run conflict checks, record VPAA digital approval, and publish final timetables. Term selection applies to both approval and the grid below."
      />
      <DoiInsFacultyInsView />
    </div>
  );
}
