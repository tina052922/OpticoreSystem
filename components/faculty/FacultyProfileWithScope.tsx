"use client";

import { useEffect, useState } from "react";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";
import { FacultyProfileWorkspace } from "@/components/faculty/FacultyProfileWorkspace";

export function FacultyProfileWithScope({
  initialCollegeId,
  enableFacultyListEdit = true,
  lockedCollegeId = null,
  gecFacultyFilter = false,
  excludeGecFaculty = false,
  writeCollegeIdFallback = null,
  writeCollegeLabel = null,
}: {
  initialCollegeId?: string | null;
  enableFacultyListEdit?: boolean;
  /** College Admin: pin every list on the page to their own college. */
  lockedCollegeId?: string | null;
  /** GEC Chairman: the roster is the GEC instructors, across every college. */
  gecFacultyFilter?: boolean;
  /** College Admin: leave GEC instructors to the GEC Chairman. */
  excludeGecFaculty?: boolean;
  /** Where a new faculty is created while the scope is campus-wide. */
  writeCollegeIdFallback?: string | null;
  writeCollegeLabel?: string | null;
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
        /*
         * "All colleges" lists every faculty — but only where no college is locked.
         *
         * DOI and CAS open on that filter and own the whole campus, so an unset college means all of
         * them. College Admin passes a locked college, and for them an unset one would be a widening
         * of scope, so they stay on the narrow reading.
         */
        allowCampusWide={!lockedCollegeId}
        writeCollegeIdFallback={writeCollegeIdFallback}
        writeCollegeLabel={writeCollegeLabel}
        gecFacultyFilter={gecFacultyFilter}
        excludeGecFaculty={excludeGecFaculty}
        enableFacultyListEdit={enableFacultyListEdit}
      />
    </>
  );
}
