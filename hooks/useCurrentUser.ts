"use client";

/**
 * Client hook for the currently authenticated user.
 *
 * Reads the user from `GET /api/auth/me` (the only safe way — the auth
 * cookies are HTTP-only and not readable from JS).
 *
 * Caching and concurrent-call de-duplication are handled centrally by
 * `apiFetch` (see `lib/api/request-cache.ts`), so every component that calls
 * this hook — plus any direct `authApi.me()` caller — shares one request and
 * one 5-minute TTL. The cache is flushed on login/logout, so a stale identity
 * can never survive an account switch.
 */

import { useCallback, useEffect, useState } from "react";
import { ApiClientError, authApi, type SafeUser } from "@/lib/api/client";

export type UseCurrentUserState = {
  user: SafeUser | null;
  loading: boolean;
  error: ApiClientError | null;
  refetch: (opts?: { forceRefresh?: boolean }) => Promise<void>;
};

export function useCurrentUser(): UseCurrentUserState {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);

  const refetch = useCallback(async (opts: { forceRefresh?: boolean } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { user: me } = await authApi.me({ forceRefresh: opts.forceRefresh });
      setUser(me);
    } catch (err) {
      setUser(null);
      if (err instanceof ApiClientError) {
        // 401 just means "signed out" — the layout handles the redirect.
        if (err.status !== 401) setError(err);
      } else {
        setError(
          new ApiClientError(0, {
            code: "NETWORK_ERROR",
            message: err instanceof Error ? err.message : "Failed to load user",
          }),
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { user, loading, error, refetch };
}
