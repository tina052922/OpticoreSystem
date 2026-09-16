"use client";

import { useCallback, useState } from "react";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";
import { SubjectCodesWorkspace } from "@/components/subjects/SubjectCodesWorkspace";

export function SubjectCodesWithScope({ initialCollegeId }: { initialCollegeId?: string | null }) {
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
          onScopeChange={handleScopeChange}
        />
        {!scopeProgramId ? (
          <p className="mt-2 text-[13px] text-black/55">
            Select a program to load and organize subject codes by year level.
          </p>
        ) : null}
      </div>
      <SubjectCodesWorkspace scopeProgramId={scopeProgramId} scopeProgramCode={scopeProgramCode} />
    </>
  );
}
