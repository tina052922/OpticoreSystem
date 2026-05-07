"use client";

import { useEffect, useState } from "react";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";
import { SubjectCodesWorkspace } from "@/components/subjects/SubjectCodesWorkspace";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SubjectCodesWithScope({ initialCollegeId }: { initialCollegeId?: string | null }) {
  const [scopeCollegeId, setScopeCollegeId] = useState<string | null>(null);
  const [scopeProgramId, setScopeProgramId] = useState<string | null>(null);
  const [scopeProgramCode, setScopeProgramCode] = useState<string | null>(null);

  useEffect(() => {
    if (!scopeCollegeId || scopeProgramId) return;
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;
      const { data } = await supabase.from("Program").select("id, code").eq("collegeId", scopeCollegeId).order("name").limit(1);
      const row = data?.[0] as { id?: string; code?: string } | undefined;
      if (!cancelled && row?.id) {
        setScopeProgramId(row.id);
        setScopeProgramCode(row.code ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scopeCollegeId, scopeProgramId]);

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 pb-2">
        <CampusScopeFilters
          initialCollegeId={initialCollegeId ?? undefined}
          onScopeChange={(s) => {
            setScopeCollegeId(s.collegeId);
            setScopeProgramId(s.programId);
            setScopeProgramCode(s.programCode);
          }}
        />
      </div>
      <SubjectCodesWorkspace scopeProgramId={scopeProgramId} scopeProgramCode={scopeProgramCode} />
    </>
  );
}
