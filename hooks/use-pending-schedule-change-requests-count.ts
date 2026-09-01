"use client";

import { useCallback, useEffect, useState } from "react";
import { scheduleChangeApi } from "@/lib/api/client";
import { usePolledCallback } from "@/hooks/use-polled-callback";
import { useRealtimeEvent } from "@/hooks/use-realtime-event";

/**
 * Live pending `ScheduleChangeRequest` count for a college (College Admin sidebar badge).
 */
export function usePendingScheduleChangeRequestsCount(
  collegeId: string | null | undefined,
  programId?: string | null,
) {
  const [count, setCount] = useState(0);

  /** Poll ticks bypass the short mount-burst TTL so the badge stays live. */
  const load = useCallback(
    async (opts: { forceRefresh?: boolean } = {}) => {
      const id = collegeId?.trim() || null;
      if (!id) {
        setCount(0);
        return;
      }
      try {
        const data = await scheduleChangeApi.pendingCount(
          { collegeId: id, programId: programId?.trim() || undefined },
          { forceRefresh: opts.forceRefresh },
        );
        setCount(data.pending);
      } catch {
        /* keep last count */
      }
    },
    [collegeId, programId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeEvent(
    "badge.changed",
    (event) => {
      if (event.payload?.badge !== "schedule_change_requests") return;
      void load({ forceRefresh: true });
    },
    { enabled: Boolean(collegeId?.trim()) },
  );

  /** Fallback behind realtime. */
  usePolledCallback(() => load({ forceRefresh: true }), {
    intervalMs: 300_000,
    enabled: Boolean(collegeId?.trim()),
  });

  return count;
}
