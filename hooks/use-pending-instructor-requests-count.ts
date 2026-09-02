"use client";

import { useCallback, useEffect, useState } from "react";
import { instructorRequestsApi } from "@/lib/api/client";
import { usePolledCallback } from "@/hooks/use-polled-callback";
import { useRealtimeEvent } from "@/hooks/use-realtime-event";

/**
 * Instructor self-registrations awaiting approval in the viewer's college.
 *
 * 🔒 No `collegeId` argument: the API scopes the count from the session, so a
 * caller cannot ask about another college's queue. `enabled` exists only to
 * skip the request entirely for roles that have no such queue.
 */
export function usePendingInstructorRequestsCount(
  opts: { enabled?: boolean } = {},
) {
  const enabled = opts.enabled ?? false;
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!enabled) {
      setCount(0);
      return;
    }
    try {
      const data = await instructorRequestsApi.count();
      setCount(data.pending);
    } catch {
      /* keep last count on transient errors */
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeEvent(
    "badge.changed",
    (event) => {
      if (event.payload?.badge !== "instructor_requests") return;
      void load();
    },
    { enabled },
  );

  /** Fallback behind realtime — see NotificationBell for the rationale. */
  usePolledCallback(() => load(), { intervalMs: 300_000, enabled });

  return count;
}
