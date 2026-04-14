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
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { defaultAcademicPeriodId, Q } from "@/lib/supabase/catalog-columns";
import { SEMESTER_FILTER_STORAGE_KEY, SEMESTER_FILTER_URL_PARAM } from "@/lib/semester-filter-storage";
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

/**
 * Campus-wide academic term filter: loads `AcademicPeriod` rows, persists selection in
 * `localStorage` and the `periodId` query param (best-effort) so Evaluator / INS / schedules stay aligned.
 */
export function SemesterFilterProvider({ children }: { children: ReactNode }) {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodIdState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Load catalog once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        if (!cancelled) {
          setError("Supabase is not configured.");
          setLoading(false);
          setReady(true);
        }
        return;
      }
      const { data, error: e } = await supabase
        .from("AcademicPeriod")
        .select(Q.academicPeriod)
        .order("startDate", { ascending: false });
      if (cancelled) return;
      if (e) {
        setError(e.message);
        setLoading(false);
        setReady(true);
        return;
      }
      const list = (data ?? []) as AcademicPeriod[];
      setPeriods(list);

      const urlId = readUrlPeriodId();
      const stored = readStoredPeriodId();
      const fallback = defaultAcademicPeriodId(list);
      let pick = "";
      if (urlId && list.some((p) => p.id === urlId)) pick = urlId;
      else if (stored && list.some((p) => p.id === stored)) pick = stored;
      else pick = fallback;

      setSelectedPeriodIdState(pick);
      try {
        if (pick) localStorage.setItem(SEMESTER_FILTER_STORAGE_KEY, pick);
      } catch {
        /* ignore */
      }
      writeUrlPeriodId(pick);
      setLoading(false);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
