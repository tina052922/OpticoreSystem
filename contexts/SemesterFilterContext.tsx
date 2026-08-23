"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ApiClientError,
  semestersApi,
  type AcademicPeriod as ApiAcademicPeriod,
} from "@/lib/api/client";
function defaultAcademicPeriodId(list: { id: string; isCurrent?: boolean | null }[]): string {
  const cur = list.find((p) => p.isCurrent);
  return cur?.id ?? list[0]?.id ?? "";
}
import { SEMESTER_FILTER_STORAGE_KEY, SEMESTER_FILTER_URL_PARAM } from "@/lib/semester-filter-storage";
import { SYSTEM_CONFIG_RELOAD_EVENT, subscribeSystemConfigBroadcast } from "@/lib/system-configuration/system-config-reload";
import { useRealtimeEvent } from "@/hooks/use-realtime-event";
import type { AcademicPeriod } from "@/types/db";

export type SemesterFilterContextValue = {
  /** All rows from `AcademicPeriod`, newest first. */
  periods: AcademicPeriod[];
  /** Selected term id (matches `ScheduleEntry.academicPeriodId`). */
  selectedPeriodId: string;
  setSelectedPeriodId: (id: string) => void;
  selectedPeriod: AcademicPeriod | null;
  /** True once periods are loaded and a selection is resolved. */
  ready: boolean;
  loading: boolean;
  error: string | null;
};

const SemesterFilterContext = createContext<SemesterFilterContextValue | null>(null);

function readStoredPeriodId(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(SEMESTER_FILTER_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function readUrlPeriodId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return new URL(window.location.href).searchParams.get(SEMESTER_FILTER_URL_PARAM)?.trim() || null;
  } catch {
    return null;
  }
}

function writeUrlPeriodId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const u = new URL(window.location.href);
    if (id) u.searchParams.set(SEMESTER_FILTER_URL_PARAM, id);
    else u.searchParams.delete(SEMESTER_FILTER_URL_PARAM);
    window.history.replaceState({}, "", u.toString());
  } catch {
    /* ignore */
  }
}

/** API → DB type shape (they're identical fields but the local AcademicPeriod
 *  type may carry extra optional fields elsewhere — this keeps imports honest). */
function toLocalAcademicPeriod(r: ApiAcademicPeriod): AcademicPeriod {
  return r as unknown as AcademicPeriod;
}

/**
 * Campus-wide academic term filter: loads `AcademicPeriod` rows via the
 * Express backend (`semestersApi.list`), persists selection in
 * `localStorage` and the `periodId` query param.
 *
 * Realtime updates are not subscribed here (the previous Supabase
 * realtime channel is gone). Instead we listen for in-app
 * `SYSTEM_CONFIG_RELOAD_EVENT` (dispatched after the admin saves the
 * scheduling-policy form) which forces a fresh fetch.
 */
export function SemesterFilterProvider({ children }: { children: ReactNode }) {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodIdState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const reloadPeriods = useCallback(async (opts: { forceRefresh?: boolean } = {}) => {
    try {
      const { semesters } = await semestersApi.list({ forceRefresh: opts.forceRefresh });
      const list = semesters.map(toLocalAcademicPeriod);
      setPeriods(list);
      setSelectedPeriodIdState((prev) => {
        const urlId = readUrlPeriodId();
        const stored = readStoredPeriodId();
        const fallback = defaultAcademicPeriodId(list);
        if (prev && list.some((p) => p.id === prev)) return prev;
        if (urlId && list.some((p) => p.id === urlId)) return urlId;
        if (stored && list.some((p) => p.id === stored)) return stored;
        return fallback;
      });
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load semesters",
      );
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      if (!cancelled) await reloadPeriods();
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadPeriods]);

  /** Cross-user push when an admin creates a term or switches the current one. */
  useRealtimeEvent("period.changed", () => {
    void reloadPeriods({ forceRefresh: true });
  });

  useEffect(() => {
    // These fire because a term was just edited — bypass the TTL.
    const onConfig = () => {
      void reloadPeriods({ forceRefresh: true });
    };
    window.addEventListener(SYSTEM_CONFIG_RELOAD_EVENT, onConfig);
    const unsubBc = subscribeSystemConfigBroadcast((d) => {
      if (d?.source === "academicPeriod") void reloadPeriods({ forceRefresh: true });
    });
    return () => {
      window.removeEventListener(SYSTEM_CONFIG_RELOAD_EVENT, onConfig);
      unsubBc();
    };
  }, [reloadPeriods]);

  const setSelectedPeriodId = useCallback((id: string) => {
    setSelectedPeriodIdState(id);
    try {
      if (id) localStorage.setItem(SEMESTER_FILTER_STORAGE_KEY, id);
      else localStorage.removeItem(SEMESTER_FILTER_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    writeUrlPeriodId(id);
  }, []);

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === selectedPeriodId) ?? null,
    [periods, selectedPeriodId],
  );

  const value = useMemo<SemesterFilterContextValue>(
    () => ({
      periods,
      selectedPeriodId,
      setSelectedPeriodId,
      selectedPeriod,
      ready,
      loading,
      error,
    }),
    [periods, selectedPeriodId, setSelectedPeriodId, selectedPeriod, ready, loading, error],
  );

  return <SemesterFilterContext.Provider value={value}>{children}</SemesterFilterContext.Provider>;
}

export function useSemesterFilter(): SemesterFilterContextValue {
  const ctx = useContext(SemesterFilterContext);
  if (!ctx) {
    throw new Error("useSemesterFilter must be used within SemesterFilterProvider");
  }
  return ctx;
}

/** For hooks that may run outside the shell (tests); falls back to isolated behavior. */
export function useSemesterFilterOptional(): SemesterFilterContextValue | null {
  return useContext(SemesterFilterContext);
}
