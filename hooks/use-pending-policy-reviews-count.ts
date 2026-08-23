"use client";

import { useCallback, useEffect, useState } from "react";
import { policyReviewsApi } from "@/lib/api/client";
import { usePolledCallback } from "@/hooks/use-polled-callback";
import { useRealtimeEvent } from "@/hooks/use-realtime-event";

/**
 * Pending DOI policy reviews count (ScheduleLoadJustification not yet accepted/rejected).
 */
export function usePendingPolicyReviewsCount(args?: { collegeId?: string | null; enabled?: boolean }) {
  const [count, setCount] = useState(0);

  /** Poll ticks bypass the short mount-burst TTL so the badge stays live. */
  const load = useCallback(
    async (opts: { forceRefresh?: boolean } = {}) => {
      const enabled = args?.enabled ?? true;
      if (!enabled) {
        setCount(0);
        return;
      }
      try {
        const data = await policyReviewsApi.pendingCount(
          { collegeId: args?.collegeId?.trim() || undefined },
          { forceRefresh: opts.forceRefresh },
        );
        setCount(data.pending);
      } catch {
        /* keep last count */
      }
    },
    [args?.collegeId, args?.enabled],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeEvent(
    "badge.changed",
    (event) => {
      if (event.payload?.badge !== "policy_reviews") return;
      void load({ forceRefresh: true });
    },
    { enabled: args?.enabled ?? true },
  );

  /** Fallback behind realtime. */
  usePolledCallback(() => load({ forceRefresh: true }), {
    intervalMs: 300_000,
    enabled: args?.enabled ?? true,
  });

  return count;
}
