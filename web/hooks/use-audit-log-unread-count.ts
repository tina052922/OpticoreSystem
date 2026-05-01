"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const STORAGE_PREFIX = "opticore:audit-log-last-seen:";

export function auditLogUnreadStorageKey(scope: string): string {
  return `${STORAGE_PREFIX}${scope}`;
}

/** Call when the user opens the audit log page so the sidebar “new activity” badge clears. */
export function markAuditLogPageSeen(scope: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(auditLogUnreadStorageKey(scope), new Date().toISOString());
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Count of audit rows newer than the last time the user opened the audit log for this `scope`
 * (College vs DOI keep separate timestamps).
 */
export function useAuditLogUnreadCount(args: { enabled?: boolean; storageScope: string }) {
  const [count, setCount] = useState(0);
  const enabled = args.enabled ?? true;

  const load = useCallback(async () => {
    if (!enabled) {
      setCount(0);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    let since = new Date(0).toISOString();
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(auditLogUnreadStorageKey(args.storageScope));
        if (raw && !Number.isNaN(Date.parse(raw))) since = raw;
      } catch {
        /* ignore */
      }
    }
    const { count: n, error } = await supabase
      .from("AuditLog")
      .select("id", { count: "exact", head: true })
      .gt("createdAt", since);
    if (!error && typeof n === "number") setCount(n);
  }, [enabled, args.storageScope]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => void load(), 120_000);
    return () => window.clearInterval(id);
  }, [enabled, load]);

  // Realtime keeps the badge fresh without waiting for the 2‑minute poll.
  useEffect(() => {
    if (!enabled) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`audit-unread:${args.storageScope}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "AuditLog" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, load, args.storageScope]);

  return count;
}
