"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiClientError, accessRequestsApi } from "@/lib/api/client";
import type { AccessRequestRow } from "@/types/db";

/**
 * The Express backend doesn't (yet) join the requester display name; for
 * now the UI tolerates the field being missing. When the
 * `/api/access-requests` endpoint grows a server-side join, populate
 * `requesterName` here without touching consumers.
 */
export type AccessRequestWithName = AccessRequestRow & { requesterName?: string };

export function useAccessRequests(enabled = true) {
  const [requests, setRequests] = useState<AccessRequestWithName[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { requests } = await accessRequestsApi.list();
      setRequests(requests as AccessRequestWithName[]);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        setRequests([]);
      }
      // Soft-fail on other errors — keep the previous list.
    } finally {
      setLoading(false);
    }
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
