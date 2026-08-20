"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";
import { SubjectCodesWorkspace } from "@/components/subjects/SubjectCodesWorkspace";

export function SubjectCodesWithScope({ initialCollegeId }: { initialCollegeId?: string | null }) {
  const [scopeCollegeId, setScopeCollegeId] = useState<string | null>(null);
  const [scopeProgramId, setScopeProgramId] = useState<string | null>(null);
  const [scopeProgramCode, setScopeProgramCode] = useState<string | null>(null);
  const collegeResolvedRef = useRef<string | null>(null);

  const handleScopeChange = useCallback((s: { collegeId: string | null; programId: string | null; programCode: string | null }) => {
    setScopeCollegeId(s.collegeId);
    setScopeProgramId(s.programId);
    setScopeProgramCode(s.programCode);
    collegeResolvedRef.current = null;
  }, []);

  const scopeCollegeIdRef = useRef(scopeCollegeId);

  useEffect(() => {
    // Only auto-select when college changes, not when program is cleared
    const collegeChanged = scopeCollegeIdRef.current !== scopeCollegeId;
    scopeCollegeIdRef.current = scopeCollegeId;
    if (!collegeChanged || !scopeCollegeId || scopeProgramId) return;
    let cancelled = false;
    (async () => {
      try {
        const { apiFetch } = await import("@/lib/api/client");
        const data = await apiFetch<{ programs: { id: string; code: string }[] }>(
          `/api/catalog/programs?collegeId=${scopeCollegeId}`,
          { method: "GET" },
        );
        const row = data.programs?.[0];
        if (!cancelled && row?.id) {
          setScopeProgramId(row.id);
          setScopeProgramCode(row.code ?? null);
        }
      } catch { /* ignore */ }
    })();
    return () => {
      cancelled = true;
    };
  }, [scopeCollegeId]);

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 pb-2">
        <CampusScopeFilters
          initialCollegeId={initialCollegeId ?? undefined}
          onScopeChange={handleScopeChange}
        />
      </div>
      <SubjectCodesWorkspace scopeProgramId={scopeProgramId} scopeProgramCode={scopeProgramCode} />
    </>
  );
}
