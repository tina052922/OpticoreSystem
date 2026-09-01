"use client";

import { useCallback, useEffect, useState } from "react";
import { instructorRegistrationsApi } from "@/lib/api/client";
import { usePolledCallback } from "@/hooks/use-polled-callback";
import { useRealtimeEvent } from "@/hooks/use-realtime-event";

export function usePendingInstructorRegistrationsCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  const load = useCallback(
    async (opts: { forceRefresh?: boolean } = {}) => {
      if (!enabled) {
        setCount(0);
        return;
      }
      try {
        const data = await instructorRegistrationsApi.pendingCount({ forceRefresh: opts.forceRefresh });
        setCount(data.pending);
      } catch {
        /* keep last count */
      }
    },
    [enabled],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeEvent(
    "badge.changed",
    (event) => {
      if (event.payload?.badge !== "instructor_registrations") return;
      void load({ forceRefresh: true });
    },
    { enabled },
  );

  usePolledCallback(() => load({ forceRefresh: true }), {
    intervalMs: 300_000,
    enabled,
  });

  return count;
}
