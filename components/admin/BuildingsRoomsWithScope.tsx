"use client";

import { useCallback, useState } from "react";
import { ScopeSearchPicker } from "@/components/campus/ScopeSearchPicker";
import { BuildingsRoomsWorkspace } from "@/components/admin/BuildingsRoomsWorkspace";

export function BuildingsRoomsWithScope({
  initialCollegeId,
  lockedCollegeId = null,
}: {
  initialCollegeId?: string | null;
  /** College Admin: the scope cannot leave their own college. */
  lockedCollegeId?: string | null;
}) {
  // A College Admin starts — and stays — in their own college; DOI starts campus-wide.
  const [scopeCollegeId, setScopeCollegeId] = useState<string | null>(
    lockedCollegeId ?? initialCollegeId ?? null,
  );
  const [scopeProgramId, setScopeProgramId] = useState<string | null>(null);
  const [scopeProgramCode, setScopeProgramCode] = useState<string | null>(null);

  const handleScopeChange = useCallback(
    (s: { collegeId: string | null; programId: string | null; programCode: string | null }) => {
      setScopeCollegeId(lockedCollegeId ?? s.collegeId);
      setScopeProgramId(s.programId);
      setScopeProgramCode(s.programCode);
    },
    [lockedCollegeId],
  );

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 pb-2">
        <ScopeSearchPicker
          value={{ collegeId: scopeCollegeId, programId: scopeProgramId }}
          onChange={handleScopeChange}
          label="Scope"
          placeholder={
            lockedCollegeId
              ? "Search a department in your college"
              : "Search a college or department — code or name"
          }
          helpText={
            lockedCollegeId
              ? "Your college. Pick a department to narrow the list further."
              : "Leave empty to see every building on campus."
          }
          withinCollegeId={lockedCollegeId}
          className="max-w-xl"
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
