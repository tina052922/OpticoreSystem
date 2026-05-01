"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Small “recent activity” count for the Audit log menu badge.
 * Uses RLS: College Admin sees their college rows; DOI sees campus-wide.
 */
export function useRecentAuditLogCount(args?: { windowHours?: number; enabled?: boolean }) {
  const [count, setCount] = useState(0);
  const windowHours = Math.max(1, Math.min(168, args?.windowHours ?? 24)); // 1h–7d

  const load = useCallback(async () => {
    const enabled = args?.enabled ?? true;
    if (!enabled) {
      setCount(0);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
    const { count: n, error } = await supabase
      .from("AuditLog")
      .select("id", { count: "exact", head: true })
      .gte("createdAt", since);
    if (!error && typeof n === "number") setCount(n);
  }, [windowHours, args?.enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const enabled = args?.enabled ?? true;
    if (!enabled) return;
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  return count;
}

