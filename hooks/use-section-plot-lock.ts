"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getRealtimeConnectionId,
  releasePlotLock,
  requestPlotLock,
  watchPlotPresence,
  type PlotLock,
} from "@/lib/realtime/realtime-client";

/** "Plotting — COTE Admin (Edryl Moratas)". */
export function plotLockLabel(lock: Pick<PlotLock, "roleLabel" | "name">): string {
  return `Plotting — ${lock.roleLabel} (${lock.name})`;
}

/**
 * Live plotting lock for one section of one term.
 *
 *   • `holder` — someone else (another window) plotting on this section right now, or null. While
 *     set, the grid is read-only for this user.
 *   • `active` — this window has the plot window open on the section: the lock is asked for, and
 *     given back when it turns false or the component goes away. If someone else got there first,
 *     `onDenied` runs with who it is (close the window and say so).
 */
export function useSectionPlotLock(args: {
  academicPeriodId: string | null | undefined;
  sectionId: string | null | undefined;
  active: boolean;
  onDenied?: (holder: PlotLock) => void;
}): { holder: PlotLock | null } {
  const periodId = args.academicPeriodId ?? "";
  const sectionId = args.sectionId ?? "";
  const [locks, setLocks] = useState<PlotLock[]>([]);
  const onDeniedRef = useRef(args.onDenied);
  onDeniedRef.current = args.onDenied;

  useEffect(() => {
    if (!periodId) {
      setLocks([]);
      return;
    }
    return watchPlotPresence(periodId, setLocks);
  }, [periodId]);

  useEffect(() => {
    if (!args.active || !periodId || !sectionId) return;
    let cancelled = false;
    void requestPlotLock(periodId, sectionId).then((res) => {
      if (cancelled || res.ok) return;
      onDeniedRef.current?.(res.holder);
    });
    return () => {
      cancelled = true;
      releasePlotLock(periodId, sectionId);
    };
  }, [args.active, periodId, sectionId]);

  const holder = useMemo(() => {
    if (!sectionId) return null;
    const mine = getRealtimeConnectionId();
    return locks.find((l) => l.sectionId === sectionId && l.socketId !== mine) ?? null;
  }, [locks, sectionId]);

  return { holder };
}
