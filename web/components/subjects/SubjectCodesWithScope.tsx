"use client";

import { useState } from "react";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";
import { SubjectCodesWorkspace } from "@/components/subjects/SubjectCodesWorkspace";

export function SubjectCodesWithScope({ initialCollegeId }: { initialCollegeId?: string | null }) {
  const [scopeProgramId, setScopeProgramId] = useState<string | null>(null);
  const [scopeProgramCode, setScopeProgramCode] = useState<string | null>(null);

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 pb-2">
        <CampusScopeFilters
          initialCollegeId={initialCollegeId ?? undefined}
          onScopeChange={(s) => {
            setScopeProgramId(s.programId);
            setScopeProgramCode(s.programCode);
          }}
        />
      </div>
      <SubjectCodesWorkspace scopeProgramId={scopeProgramId} scopeProgramCode={scopeProgramCode} />
    </>
  );
}
