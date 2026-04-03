"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccessRequestRow } from "@/types/db";

export type AccessRequestWithName = AccessRequestRow & { requesterName?: string };

export function useAccessRequests(enabled = true) {
  const [requests, setRequests] = useState<AccessRequestWithName[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/access-requests", { credentials: "include" });
    const data = (await res.json().catch(() => null)) as { requests?: AccessRequestWithName[] } | null;
    if (res.ok && data?.requests) setRequests(data.requests);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void load();
  }, [enabled, load]);

  return { requests, loading, reload: load };
}
