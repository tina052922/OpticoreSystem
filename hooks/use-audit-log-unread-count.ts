"use client";

import { useCallback, useEffect, useState } from "react";
import { auditLogApi } from "@/lib/api/client";
import { usePolledCallback } from "@/hooks/use-polled-callback";

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

  /** Poll ticks bypass the short mount-burst TTL so the badge stays live. */
  const load = useCallback(
    async (opts: { forceRefresh?: boolean } = {}) => {
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
        const data = await auditLogApi.unreadCount(
          { since },
          { forceRefresh: opts.forceRefresh },
        );
        setCount(data.unread);
      } catch {
        /* keep last count */
      }
    },
    [enabled, args.storageScope],
  );

  useEffect(() => {
    void load();
  }, [load]);

  usePolledCallback(() => load({ forceRefresh: true }), {
    intervalMs: 120_000,
    enabled,
  });

  return count;
}
