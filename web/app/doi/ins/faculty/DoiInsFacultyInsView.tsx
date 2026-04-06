"use client";

import { INSFormFaculty } from "@/components/ins/INSFormFaculty";
import { DoiInsFormalApprovalPanel } from "@/components/doi/DoiInsFormalApprovalPanel";

/**
 * DOI INS Form 5A — campus-wide data + embedded VPAA formal approval and conflict scan.
 */
export function DoiInsFacultyInsView() {
  return (
    <INSFormFaculty
      insBasePath="/doi/ins"
      campusWide
      doiApprovalSlot={(ctx) => (
        <DoiInsFormalApprovalPanel
          periodId={ctx.periodId}
          periods={ctx.periods}
          onPeriodIdChange={ctx.onPeriodIdChange}
          reloadCatalog={ctx.reloadCatalog}
        />
      )}
    />
  );
}
