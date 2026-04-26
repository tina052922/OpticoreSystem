"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Live pending `ScheduleChangeRequest` count for a college (College Admin sidebar badge).
 * Uses Supabase Realtime when the table is in the `supabase_realtime` publication; otherwise the count
 * still updates on navigation and on a light polling interval.
 */
export function usePendingScheduleChangeRequestsCount(collegeId: string | null | undefined) {
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
      .from("ScheduleChangeRequest")
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
      .channel(`scr-pending:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ScheduleChangeRequest",
          filter: `collegeId=eq.${id}`,
        },
        () => void load(),
      )
      .subscribe();

    const poll = window.setInterval(() => void load(), 45_000);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [collegeId, load]);

  return count;
}
