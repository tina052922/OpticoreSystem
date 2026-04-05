"use client";

import { useEffect, useState } from "react";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";
import { FacultyProfileWorkspace } from "@/components/faculty/FacultyProfileWorkspace";

export function FacultyProfileWithScope({ initialCollegeId }: { initialCollegeId?: string | null }) {
  const [scopeCollegeId, setScopeCollegeId] = useState<string | null>(initialCollegeId ?? null);

  useEffect(() => {
    if (initialCollegeId) setScopeCollegeId(initialCollegeId);
  }, [initialCollegeId]);

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 pb-2">
        <CampusScopeFilters
          initialCollegeId={initialCollegeId ?? undefined}
          onScopeChange={(s) => setScopeCollegeId(s.collegeId)}
        />
      </div>
      <FacultyProfileWorkspace scopeCollegeId={scopeCollegeId} />
    </>
  );
}
