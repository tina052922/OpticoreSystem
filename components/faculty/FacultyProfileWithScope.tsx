"use client";

import { useEffect, useState } from "react";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";
import { FacultyProfileWorkspace } from "@/components/faculty/FacultyProfileWorkspace";

export function FacultyProfileWithScope({
  initialCollegeId,
  enableFacultyListEdit = true,
  lockedCollegeId = null,
}: {
  initialCollegeId?: string | null;
  enableFacultyListEdit?: boolean;
  /** College Admin: pin every list on the page to their own college. */
  lockedCollegeId?: string | null;
}) {
  const [scopeCollegeId, setScopeCollegeId] = useState<string | null>(
    lockedCollegeId ?? initialCollegeId ?? null,
  );
  const [scopeProgramId, setScopeProgramId] = useState<string | null>(null);

  useEffect(() => {
    if (initialCollegeId) setScopeCollegeId(initialCollegeId);
  }, [initialCollegeId]);

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 pb-2">
        <CampusScopeFilters
          initialCollegeId={initialCollegeId ?? undefined}
          lockedCollegeId={lockedCollegeId}
          onScopeChange={(s) => {
            // A locked college is the floor: a cleared scope must not widen to campus-wide.
            setScopeCollegeId(lockedCollegeId ?? s.collegeId);
            setScopeProgramId(s.programId);
          }}
        />
      </div>
      <FacultyProfileWorkspace
        scopeCollegeId={scopeCollegeId}
        scopeProgramId={scopeProgramId}
        enableFacultyListEdit={enableFacultyListEdit}
      />
    </>
  );
}
