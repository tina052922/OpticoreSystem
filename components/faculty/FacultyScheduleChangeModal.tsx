"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useOpticoreToast } from "@/components/alerts/OpticoreToastProvider";
import { scheduleChangeApi, ApiClientError } from "@/lib/api/client";
import {
  addMinutesToTimeInput,
  meetingDurationMinutes,
  toTimeInputValue,
} from "@/lib/schedule-change/request-times";
import { formatHHMMTo12h, formatTimeRange12h } from "@/lib/time/format-12h";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type ScheduleEntryOption = {
  id: string;
  label: string;
  day: string;
  startTime: string;
  endTime: string;
  subjectCode: string;
  sectionName: string;
};

type FacultyScheduleChangeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Selected academic period (shell semester filter) — must match My Schedule grid. */
  academicPeriodId: string | null;
  /** When set (e.g. user clicked a grid cell), pre-select this `ScheduleEntry` in the dropdown. */
  initialScheduleEntryId?: string | null;
};

/**
 * Request a meeting time change for one of the instructor’s plotted rows.
 * Submits to Program Chairman (`ScheduleChangeRequest`). Notifications are created in the database
 * when the row is inserted (see migration `schedule_change_request_notifications`).
 */
export function FacultyScheduleChangeModal({
  open,
  onOpenChange,
  academicPeriodId,
  initialScheduleEntryId,
}: FacultyScheduleChangeModalProps) {
  const toast = useOpticoreToast();
  const [entries, setEntries] = useState<ScheduleEntryOption[]>([]);
  const [periodName, setPeriodName] = useState<string | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [scheduleEntryId, setScheduleEntryId] = useState("");
  const [requestedDay, setRequestedDay] = useState("Monday");
  const [requestedStartTime, setRequestedStartTime] = useState("08:00");
  const [requestedEndTime, setRequestedEndTime] = useState("09:00");
  const [requestedRoomId, setRequestedRoomId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridWeekdays, setGridWeekdays] = useState<string[]>([]);
  const [gridCells, setGridCells] = useState<
    Array<{
      day: string;
      startTime: string;
      endTime: string;
      status: "original" | "available" | "busy" | "no_room";
      reason: string | null;
      freeRooms: { id: string; code: string }[];
    }>
  >([]);

  /** When this differs from current `scheduleEntryId`, resetting day/start/end comes from DB row bounds. */
  const lastHydratedScheduleEntryIdRef = useRef<string>("");

  const loadEntries = useCallback(async () => {
    if (!academicPeriodId) return;
    setLoadingEntries(true);
    try {
      const data = await scheduleChangeApi.instructorEntries({ periodId: academicPeriodId });
      setEntries(
        (data.entries ?? []).flatMap((e) => {
          if (!e?.id) return [];
          return [
            {
              id: e.id,
              label: `${e.subject ?? "Class"} — ${e.section ?? "—"}`,
              day: e.day || "Monday",
              startTime: e.startTime || "08:00",
              endTime: e.endTime || "09:00",
              subjectCode: e.subject ?? "",
              sectionName: e.section ?? "",
            },
          ];
        }),
      );
      setPeriodName(data.periodName ?? null);
    } catch {
      setEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  }, [academicPeriodId]);

  useEffect(() => {
    if (!open || !academicPeriodId) return;
    void loadEntries();
  }, [open, academicPeriodId, loadEntries]);

  useEffect(() => {
    if (!open) return;
    if (initialScheduleEntryId) {
      setScheduleEntryId(initialScheduleEntryId);
    } else {
      setScheduleEntryId("");
    }
    setDone(false);
    setError(null);
    setReason("");
    setRequestedRoomId("");
    setGridCells([]);
    lastHydratedScheduleEntryIdRef.current = "";
  }, [open, initialScheduleEntryId]);

  useEffect(() => {
    if (!open || !academicPeriodId || !scheduleEntryId) {
      setGridCells([]);
      return;
    }
    let cancelled = false;
    setGridLoading(true);
    void (async () => {
      try {
        const data = await scheduleChangeApi.requestGrid({
          periodId: academicPeriodId,
          scheduleEntryId,
        });
        if (cancelled) return;
        setGridWeekdays(data.weekdays ?? []);
        setGridCells(data.cells ?? []);
      } catch {
        if (!cancelled) {
          setGridWeekdays(WEEKDAYS);
          setGridCells([]);
        }
      } finally {
        if (!cancelled) setGridLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, academicPeriodId, scheduleEntryId]);

  useEffect(() => {
    if (!open) return;
    if (!scheduleEntryId) {
      lastHydratedScheduleEntryIdRef.current = "";
    }
  }, [open, scheduleEntryId]);

  /**
   * Keep requested window duration equal to the selected class: changing start recomputes end (e.g. 3h stays 3h).
   */
  useEffect(() => {
    if (!open || !scheduleEntryId || entries.length === 0) return;
    const sel = entries.find((e) => e.id === scheduleEntryId);
    if (!sel?.startTime || !sel.endTime) return;
    const dur = meetingDurationMinutes(sel.startTime, sel.endTime);

    const entryChanged = scheduleEntryId !== lastHydratedScheduleEntryIdRef.current;
    if (entryChanged) {
      lastHydratedScheduleEntryIdRef.current = scheduleEntryId;
      setRequestedDay(sel.day);
      const nextStart = toTimeInputValue(sel.startTime);
      setRequestedStartTime(nextStart);
      setRequestedEndTime(addMinutesToTimeInput(nextStart, dur));
      return;
    }

    setRequestedEndTime(addMinutesToTimeInput(requestedStartTime, dur));
  }, [open, scheduleEntryId, entries, requestedStartTime]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!scheduleEntryId) {
      setError("Select a class meeting to change.");
      toast.error("Failed to submit. Please try again.", "Select a class meeting to change.");
      return;
    }
    const sel = entries.find((e) => e.id === scheduleEntryId);
    const start = toTimeInputValue(requestedStartTime || sel?.startTime);
    const dur = meetingDurationMinutes(sel?.startTime, sel?.endTime);
    const end = addMinutesToTimeInput(start, dur);
    if (!start || !end) {
      setError("Choose a valid start time.");
      toast.error("Failed to submit. Please try again.", "Choose a valid start time.");
      return;
    }
    const picked = gridCells.find((c) => c.day === requestedDay && c.startTime === start);
    if (picked && (picked.status === "busy" || picked.status === "no_room")) {
      setError("That cell is unavailable. Pick a free slot.");
      toast.error("Failed to submit. Please try again.", "That cell is unavailable.");
      return;
    }
    setSubmitting(true);
    try {
      await scheduleChangeApi.create({
        scheduleEntryId,
        requestedDay,
        requestedStartTime: start,
        requestedEndTime: end,
        requestedRoomId: requestedRoomId || undefined,
        reason,
      });
      setDone(true);
      toast.success("Request submitted successfully");
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast.error("Failed to submit. Please try again.", msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-[101] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-black/10 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-2 border-b border-black/10 px-4 py-3">
          <h2 className="text-lg font-semibold text-black">Request schedule change</h2>
          <button
            type="button"
            className="rounded-lg p-2 text-black/50 hover:bg-black/5 hover:text-black"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {done ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-950 text-sm">
              <p className="font-semibold mb-1">Request sent</p>
              <p className="leading-relaxed">
                Your Program Chairman will review and run a conflict check. Watch the notification bell for status updates.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 border-emerald-300"
                onClick={() => {
                  setDone(false);
                  setReason("");
                  onOpenChange(false);
                }}
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
              <p className="text-sm text-black/65 leading-relaxed">
                Term: <strong>{periodName ?? "—"}</strong>. Propose a new day/time for a class you teach this period.
              </p>

              {!academicPeriodId ? (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Select an academic period in the header first.
                </p>
              ) : loadingEntries ? (
                <p className="text-sm text-black/50">Loading your classes…</p>
              ) : entries.length === 0 ? (
                <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  No classes are assigned to you for this term yet.
                </p>
              ) : initialScheduleEntryId && !entries.some((e) => e.id === initialScheduleEntryId) ? (
                <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  You can only request a change for your own classes.
                </p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-black" htmlFor="fac-sc-entry">
                      Class meeting <span className="text-red-700">*</span>
                    </label>
                      <select
                      id="fac-sc-entry"
                      required
                      disabled={Boolean(initialScheduleEntryId)}
                      className="w-full h-11 rounded-lg border border-black/15 bg-white px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--color-opticore-orange)]/40 disabled:bg-black/[0.03]"
                      value={scheduleEntryId}
                      onChange={(e) => setScheduleEntryId(e.target.value)}
                    >
                      <option value="">Select a scheduled class…</option>
                      {entries.map((en) => (
                        <option key={en.id} value={en.id}>
                          {en.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-black">Pick a free day and start time</p>
                    <p className="text-[11px] text-black/55">
                      Same layout as Evaluator: days across, hours down. Duration stays{" "}
                      <strong>{formatTimeRange12h(requestedStartTime, requestedEndTime)}</strong>. Only times in this
                      Day/Evening window are listed.
                    </p>
                    <div className="flex flex-wrap gap-3 text-[10px] text-black/70">
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded-sm border border-black bg-white" /> Free
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded-sm border border-black bg-emerald-200" /> Current class
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded-sm border border-black bg-[#ff990a]" /> Selected
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded-sm border border-black bg-neutral-200" /> Unavailable
                      </span>
                    </div>
                    {gridLoading ? (
                      <p className="text-sm text-black/50">Loading available slots…</p>
                    ) : gridCells.length === 0 ? (
                      <p className="text-sm text-amber-900">Could not load the slot grid. Try again.</p>
                    ) : (
                      <div className="overflow-x-auto max-h-[min(50vh,420px)] overflow-y-auto rounded-lg border border-black">
                        <table className="w-full border-collapse border border-black text-[10px]">
                          <thead className="sticky top-0 z-10">
                            <tr>
                              <th className="border border-black bg-[#ff990a] text-white px-1 py-1 w-[88px] font-bold">
                                TIME
                              </th>
                              {(gridWeekdays.length ? gridWeekdays : WEEKDAYS).map((d) => (
                                <th
                                  key={d}
                                  className="border border-black bg-[#ff990a] text-white px-1 py-1 min-w-[72px] font-bold"
                                >
                                  {d}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[...new Set(gridCells.map((c) => c.startTime))].sort().map((start) => (
                              <tr key={start}>
                                <td className="border border-black px-1 py-1.5 text-center whitespace-nowrap font-medium bg-white">
                                  {formatHHMMTo12h(start)}
                                </td>
                                {(gridWeekdays.length ? gridWeekdays : WEEKDAYS).map((day) => {
                                  const cell = gridCells.find((c) => c.day === day && c.startTime === start);
                                  if (!cell) {
                                    return (
                                      <td
                                        key={day}
                                        className="border border-black bg-neutral-100 text-neutral-400 text-center text-[8px] font-semibold"
                                      >
                                        —
                                      </td>
                                    );
                                  }
                                  const selected =
                                    requestedDay === cell.day && requestedStartTime === cell.startTime;
                                  const blocked = cell.status === "busy" || cell.status === "no_room";
                                  const original = cell.status === "original";
                                  return (
                                    <td key={day} className="border border-black p-0 align-stretch">
                                      <button
                                        type="button"
                                        disabled={blocked}
                                        title={
                                          cell.reason
                                            ? `${formatTimeRange12h(cell.startTime, cell.endTime)} — ${cell.reason}`
                                            : formatTimeRange12h(cell.startTime, cell.endTime)
                                        }
                                        aria-label={`${cell.day} ${formatTimeRange12h(cell.startTime, cell.endTime)}${
                                          cell.reason ? ` — ${cell.reason}` : ""
                                        }`}
                                        onClick={() => {
                                          if (blocked) return;
                                          setRequestedDay(cell.day);
                                          setRequestedStartTime(cell.startTime);
                                          setRequestedEndTime(cell.endTime);
                                          setRequestedRoomId(cell.freeRooms[0]?.id ?? "");
                                        }}
                                        className={`w-full min-h-[40px] px-1 py-1.5 text-center font-semibold leading-tight ${
                                          blocked
                                            ? "cursor-not-allowed bg-neutral-200 text-neutral-500"
                                            : selected
                                              ? "bg-[#ff990a] text-white"
                                              : original
                                                ? "bg-emerald-100 text-emerald-950 hover:bg-emerald-200"
                                                : "bg-white hover:bg-[#fff7ed] text-black/70"
                                        }`}
                                      >
                                        {blocked ? "Unavailable" : original && !selected ? "Current" : selected ? "Selected" : ""}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <label className="block text-sm">
                      <span className="font-medium text-black">Available room</span>
                      <select
                        className="mt-1 w-full h-11 rounded-lg border border-black/15 bg-white px-3 text-sm"
                        value={requestedRoomId}
                        onChange={(e) => setRequestedRoomId(e.target.value)}
                      >
                        <option value="">— Select a free room —</option>
                        {(
                          gridCells.find(
                            (c) => c.day === requestedDay && c.startTime === requestedStartTime,
                          )?.freeRooms ?? []
                        ).map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.code}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-black" htmlFor="fac-sc-reason">
                      Reason <span className="text-red-700">*</span>
                    </label>
                    <textarea
                      id="fac-sc-reason"
                      required
                      minLength={8}
                      rows={3}
                      className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
                      placeholder="Explain why you need this change (min. 8 characters)."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>

                  {error ? (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-2 justify-end pt-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || entries.length === 0}
                      className="bg-[#ff990a] hover:bg-[#e68a09] text-white font-semibold"
                    >
                      {submitting ? "Submitting…" : "Submit to Chairman"}
                    </Button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
