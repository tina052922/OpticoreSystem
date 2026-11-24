"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getRealtimeConnectionId,
  releasePlotLock,
  requestPlotLock,
  updatePlotLockActivity,
  watchPlotPresence,
  type PlotActivity,
  type PlotLock,
} from "@/lib/realtime/realtime-client";

export type { PlotActivity, PlotLock };

const VERB: Record<PlotActivity["kind"], string> = {
  plotting: "Plotting",
  editing: "Editing",
  removing: "Removing",
};

/** "Removing — DOI (Edryl Moratas)". */
export function plotLockLabel(lock: Pick<PlotLock, "roleLabel" | "name" | "activity">): string {
  return `${VERB[lock.activity?.kind ?? "plotting"]} — ${lock.roleLabel} (${lock.name})`;
}

/** Short tag for the class card being worked on: "Removing…". */
export function plotLockTag(lock: Pick<PlotLock, "activity">): string {
  return `${VERB[lock.activity?.kind ?? "plotting"]}…`;
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
  /** What this window is doing, shown to the others; updated live while the lock is held. */
  activity?: PlotActivity;
  onDenied?: (holder: PlotLock) => void;
}): { holder: PlotLock | null } {
  const periodId = args.academicPeriodId ?? "";
  const sectionId = args.sectionId ?? "";
  const [locks, setLocks] = useState<PlotLock[]>([]);
  const onDeniedRef = useRef(args.onDenied);
  onDeniedRef.current = args.onDenied;
  const activityRef = useRef(args.activity);
  activityRef.current = args.activity;
  const activityKey = args.activity ? JSON.stringify(args.activity) : "";

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
    void requestPlotLock(periodId, sectionId, activityRef.current).then((res) => {
      if (cancelled || res.ok) return;
      onDeniedRef.current?.(res.holder);
    });
    return () => {
      cancelled = true;
      releasePlotLock(periodId, sectionId);
    };
  }, [args.active, periodId, sectionId]);

  // The subject or time changed while the window is open: tell the others.
  useEffect(() => {
    if (!args.active || !periodId || !sectionId || !activityRef.current) return;
    updatePlotLockActivity(periodId, sectionId, activityRef.current);
  }, [args.active, periodId, sectionId, activityKey]);

  const holder = useMemo(() => {
    if (!sectionId) return null;
    const mine = getRealtimeConnectionId();
    return locks.find((l) => l.sectionId === sectionId && l.socketId !== mine) ?? null;
  }, [locks, sectionId]);

  /*
   * Opened while the connection was still signing in, the lock was taken on trust; if someone else
   * holds the section after all, this window steps aside the same way as a refused request — two
   * windows editing one section is how one person's save undoes the other's.
   */
  const deniedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!args.active) {
      deniedForRef.current = null;
      return;
    }
    if (!holder || deniedForRef.current === holder.socketId) return;
    deniedForRef.current = holder.socketId;
    onDeniedRef.current?.(holder);
  }, [args.active, holder]);

  return { holder };
}
