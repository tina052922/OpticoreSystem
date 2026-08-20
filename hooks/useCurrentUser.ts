"use client";

/**
 * Client hook for the currently authenticated user.
 *
 * Reads the user from `GET /api/auth/me` (the only safe way — the auth
 * cookies are HTTP-only and not readable from JS). The hook caches the
 * user for 5 minutes to avoid redundant calls.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError, authApi, type SafeUser } from "@/lib/api/client";

const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  user: SafeUser | null;
  fetchedAt: number;
};

let globalCache: CacheEntry | null = null;
let fetchInProgress: Promise<void> | null = null;

export type UseCurrentUserState = {
  user: SafeUser | null;
  loading: boolean;
  error: ApiClientError | null;
  refetch: () => Promise<void>;
};

export function useCurrentUser(): UseCurrentUserState {
  const [user, setUser] = useState<SafeUser | null>(() => globalCache?.user ?? null);
  const [loading, setLoading] = useState(() => !globalCache);
  const [error, setError] = useState<ApiClientError | null>(null);
  const lastFetchRef = useRef(globalCache?.fetchedAt ?? 0);

  const refetch = useCallback(async () => {
    const now = Date.now();
    if (globalCache && now - globalCache.fetchedAt < CACHE_TTL_MS) {
      setUser(globalCache.user);
      setLoading(false);
      setError(null);
      return;
    }
    if (fetchInProgress) {
      await fetchInProgress;
      if (globalCache) {
        setUser(globalCache.user);
        setLoading(false);
        setError(null);
      }
      return;
    }
    setLoading(true);
    setError(null);
    fetchInProgress = (async () => {
      try {
        const { user: me } = await authApi.me();
        globalCache = { user: me, fetchedAt: Date.now() };
        lastFetchRef.current = globalCache.fetchedAt;
        setUser(me);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setUser(null);
          if (err.status !== 401) setError(err);
        } else {
          setUser(null);
          setError(
            new ApiClientError(0, {
              code: "NETWORK_ERROR",
              message:
                err instanceof Error ? err.message : "Failed to load user",
            }),
          );
        }
      } finally {
        fetchInProgress = null;
        setLoading(false);
      }
    })();
    await fetchInProgress;
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { user, loading, error, refetch };
}
