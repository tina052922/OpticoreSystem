"use client";

import { useCallback, useEffect, useState } from "react";
import { CasChairsPanel } from "@/components/admin/CasChairsPanel";
import { useActionToast } from "@/components/alerts/useActionToast";
import { apiFetch, campusAccountsApi, type CampusAccount } from "@/lib/api/client";

type College = { id: string; code: string; name: string };
type Program = { id: string; code: string; name: string; collegeId: string | null };

/**
 * CAS College Admin → Chairperson Assignment → CAS Chairs: the same panel DOI has (Service Chairs and
 * CAS Program Chairs, service areas). The server limits these accounts to CAS chairs.
 */
export function CollegeCasChairsTab({ collegeId }: { collegeId: string }) {
  const toast = useActionToast();
  const [colleges, setColleges] = useState<College[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [accounts, setAccounts] = useState<CampusAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [collegesRes, programsRes, accountsRes] = await Promise.all([
        apiFetch<{ colleges: College[] }>("/api/catalog/colleges", { method: "GET" }),
        apiFetch<{ programs: Program[] }>("/api/catalog/programs", { method: "GET" }),
        campusAccountsApi.list(),
      ]);
      setColleges(collegesRes.colleges ?? []);
      setPrograms(programsRes.programs ?? []);
      setAccounts(accountsRes.accounts ?? []);
    } catch (e) {
      toast.fail(e, "Could not load the CAS chairs", "college: cas chairs");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-black/55">Loading CAS chairs…</p>;
  return (
    <CasChairsPanel
      colleges={colleges}
      programs={programs}
      accounts={accounts}
      onChanged={load}
      fixedCollegeId={collegeId}
    />
  );
}
