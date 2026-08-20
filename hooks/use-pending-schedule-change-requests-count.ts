"use client";

import { useCallback, useEffect, useState } from "react";
import { scheduleChangeApi } from "@/lib/api/client";

/**
 * Live pending `ScheduleChangeRequest` count for a college (College Admin sidebar badge).
 */
export function usePendingScheduleChangeRequestsCount(collegeId: string | null | undefined) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    const id = collegeId?.trim() || null;
    if (!id) {
      setCount(0);
      return;
    }
    try {
      const data = await scheduleChangeApi.pendingCount({ collegeId: id });
      setCount(data.pending);
    } catch {
      /* keep last count */
    }
  }, [collegeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = collegeId?.trim() || null;
    if (!id) return;
    const poll = window.setInterval(() => void load(), 45_000);
    return () => window.clearInterval(poll);
  }, [collegeId, load]);

  return count;
}
