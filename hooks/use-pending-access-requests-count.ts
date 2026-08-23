"use client";

import { useCallback, useEffect, useState } from "react";
import { accessRequestsApi } from "@/lib/api/client";
import { usePolledCallback } from "@/hooks/use-polled-callback";
import { useRealtimeEvent } from "@/hooks/use-realtime-event";

/**
 * Pending access requests for a college hub (targets this `collegeId`).
 * College admins approve requests where `AccessRequest.collegeId` is their college.
 */
export function usePendingAccessRequestsCount(collegeId: string | null | undefined) {
  const [count, setCount] = useState(0);

  /**
   * `forceRefresh` is for poll ticks: the short TTL exists only to collapse the
   * mount burst from multiple nav components, not to hide a changed count.
   */
  const load = useCallback(
    async (opts: { forceRefresh?: boolean } = {}) => {
      const id = collegeId?.trim() || null;
      if (!id) {
        setCount(0);
        return;
      }
      try {
        const data = await accessRequestsApi.pendingCount(
          { collegeId: id },
          { forceRefresh: opts.forceRefresh },
        );
        setCount(data.pending);
      } catch {
        /* keep last count on transient errors */
      }
    },
    [collegeId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeEvent(
    "badge.changed",
    (event) => {
      if (event.payload?.badge !== "access_requests") return;
      void load({ forceRefresh: true });
    },
    { enabled: Boolean(collegeId?.trim()) },
  );

  /** Fallback behind realtime — see NotificationBell for the rationale. */
  usePolledCallback(() => load({ forceRefresh: true }), {
    intervalMs: 300_000,
    enabled: Boolean(collegeId?.trim()),
  });

  return count;
}
