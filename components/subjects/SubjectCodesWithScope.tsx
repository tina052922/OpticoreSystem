"use client";

import { useCallback, useState } from "react";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";
import { SubjectCodesWorkspace } from "@/components/subjects/SubjectCodesWorkspace";

export function SubjectCodesWithScope({
  initialCollegeId,
  lockedCollegeId = null,
  canEditCampusCategories = false,
}: {
  initialCollegeId?: string | null;
  /** College Admin: only their own college's departments may be scoped to. */
  lockedCollegeId?: string | null;
  /** DOI: may rename and remove the campus-wide subject categories. */
  canEditCampusCategories?: boolean;
}) {
  const [scopeProgramId, setScopeProgramId] = useState<string | null>(null);
  const [scopeProgramCode, setScopeProgramCode] = useState<string | null>(null);

  const handleScopeChange = useCallback((s: { collegeId: string | null; programId: string | null; programCode: string | null }) => {
    setScopeProgramId(s.programId);
    setScopeProgramCode(s.programCode);
  }, []);

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 pb-2">
        <CampusScopeFilters
          initialCollegeId={initialCollegeId ?? undefined}
          lockedCollegeId={lockedCollegeId}
          requireProgram
          onScopeChange={handleScopeChange}
        />
      </div>
      <SubjectCodesWorkspace
        scopeProgramId={scopeProgramId}
        scopeProgramCode={scopeProgramCode}
        canEditCampusCategories={canEditCampusCategories}
      />
    </>
  );
}
