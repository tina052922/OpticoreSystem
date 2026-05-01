"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Pending DOI policy reviews count (ScheduleLoadJustification not yet accepted/rejected).
 * Uses RLS: DOI sees campus-wide; College Admin sees only their college rows.
 */
export function usePendingPolicyReviewsCount(args?: { collegeId?: string | null; enabled?: boolean }) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    const enabled = args?.enabled ?? true;
    if (!enabled) {
      setCount(0);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    let q = supabase
      .from("ScheduleLoadJustification")
      .select("id", { count: "exact", head: true })
      .or("doiDecision.is.null,doiDecision.eq.pending");

    const collegeId = args?.collegeId?.trim() || null;
    if (collegeId) q = q.eq("collegeId", collegeId);

    const { count: n, error } = await q;
    if (!error && typeof n === "number") setCount(n);
  }, [args?.collegeId, args?.enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), 45_000);
    return () => window.clearInterval(id);
  }, [load]);

  // INSERT/UPDATE (chair submit or DOI decision) so College Admin + DOI badges stay aligned without full page refresh.
  useEffect(() => {
    const enabled = args?.enabled ?? true;
    if (!enabled) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const collegeId = args?.collegeId?.trim() || null;
    const scope = collegeId ?? "doi";
    const channel = supabase
      .channel(`slj-pending:${scope}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ScheduleLoadJustification",
          ...(collegeId ? { filter: `collegeId=eq.${collegeId}` } : {}),
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [args?.collegeId, args?.enabled, load]);

  return count;
}

