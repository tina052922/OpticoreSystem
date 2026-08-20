"use client";

import { useCallback, useEffect, useState } from "react";
import { policyReviewsApi } from "@/lib/api/client";

/**
 * Pending DOI policy reviews count (ScheduleLoadJustification not yet accepted/rejected).
 */
export function usePendingPolicyReviewsCount(args?: { collegeId?: string | null; enabled?: boolean }) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    const enabled = args?.enabled ?? true;
    if (!enabled) {
      setCount(0);
      return;
    }
    try {
      const data = await policyReviewsApi.pendingCount({
        collegeId: args?.collegeId?.trim() || undefined,
      });
      setCount(data.pending);
    } catch {
      /* keep last count */
    }
  }, [args?.collegeId, args?.enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), 45_000);
    return () => window.clearInterval(id);
  }, [load]);

  return count;
}
