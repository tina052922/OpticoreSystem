"use client";

import { useCallback, useEffect, useState } from "react";
import { accessRequestsApi } from "@/lib/api/client";

/**
 * Pending access requests for a college hub (targets this `collegeId`).
 * College admins approve requests where `AccessRequest.collegeId` is their college.
 */
export function usePendingAccessRequestsCount(collegeId: string | null | undefined) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    const id = collegeId?.trim() || null;
    if (!id) {
      setCount(0);
      return;
    }
    try {
      const data = await accessRequestsApi.pendingCount({ collegeId: id });
      setCount(data.pending);
    } catch {
      /* keep last count on transient errors */
    }
  }, [collegeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = collegeId?.trim() || null;
    if (!id) return;
    const poll = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(poll);
  }, [collegeId, load]);

  return count;
}
