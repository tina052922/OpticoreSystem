"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";
import { BuildingsRoomsWorkspace } from "@/components/admin/BuildingsRoomsWorkspace";

export function BuildingsRoomsWithScope({ initialCollegeId }: { initialCollegeId?: string | null }) {
  const [scopeCollegeId, setScopeCollegeId] = useState<string | null>(null);
  const [scopeProgramId, setScopeProgramId] = useState<string | null>(null);
  const [scopeProgramCode, setScopeProgramCode] = useState<string | null>(null);
  const scopeCollegeIdRef = useRef(scopeCollegeId);

  const handleScopeChange = useCallback(
    (s: { collegeId: string | null; programId: string | null; programCode: string | null }) => {
      setScopeCollegeId(s.collegeId);
      setScopeProgramId(s.programId);
      setScopeProgramCode(s.programCode);
    },
    [],
  );

  // "All departments" stays all departments. This used to auto-pick the college's first program
  // (COTE landed on BIT-AUTO), which silently narrowed the buildings list to one department.
  useEffect(() => {
    scopeCollegeIdRef.current = scopeCollegeId;
  }, [scopeCollegeId]);

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 pb-2">
        <CampusScopeFilters
          initialCollegeId={initialCollegeId ?? undefined}
          onScopeChange={handleScopeChange}
        />
      </div>
      <BuildingsRoomsWorkspace
        scopeCollegeId={scopeCollegeId}
        scopeProgramId={scopeProgramId}
        scopeProgramCode={scopeProgramCode}
      />
    </>
  );
}
