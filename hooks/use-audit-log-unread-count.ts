"use client";

import { useCallback, useEffect, useState } from "react";
import { auditLogApi } from "@/lib/api/client";

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
    let since = new Date(0).toISOString();
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(auditLogUnreadStorageKey(args.storageScope));
        if (raw && !Number.isNaN(Date.parse(raw))) since = raw;
      } catch {
        /* ignore */
      }
    }
    try {
      const data = await auditLogApi.unreadCount({ since });
      setCount(data.unread);
    } catch {
      /* keep last count */
    }
  }, [enabled, args.storageScope]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => void load(), 120_000);
    return () => window.clearInterval(id);
  }, [enabled, load]);

  return count;
}
