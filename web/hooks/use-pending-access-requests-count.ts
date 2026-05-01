"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Pending access requests for a college hub (targets this `collegeId`).
 * College admins approve requests where `AccessRequest.collegeId` is their college.
 */
export function usePendingAccessRequestsCount(collegeId: string | null | undefined) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    const id = collegeId?.trim() || null;
    if (!id) {
      setCount(0);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const { count: n, error } = await supabase
      .from("AccessRequest")
      .select("id", { count: "exact", head: true })
      .eq("collegeId", id)
      .eq("status", "pending");
    if (!error && typeof n === "number") setCount(n);
  }, [collegeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = collegeId?.trim() || null;
    if (!id) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`access-req-pending:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "AccessRequest", filter: `collegeId=eq.${id}` },
        () => void load(),
      )
      .subscribe();
    const poll = window.setInterval(() => void load(), 60_000);
    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [collegeId, load]);

  return count;
}
