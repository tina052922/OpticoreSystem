"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useOpticoreToast } from "@/components/alerts/OpticoreToastProvider";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function timeToMinutes(t: string): number {
  const raw = t.trim();
  const base = raw.length > 5 ? raw.slice(0, 5) : raw;
  const [h, m] = base.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/** Value for `<input type="time" />` (HH:MM). */
function toTimeInputValue(t: string): string {
  const m = timeToMinutes(t);
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function addMinutesToTimeInput(start: string, durationMinutes: number): string {
  const m = timeToMinutes(start) + durationMinutes;
  const norm = ((m % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(norm / 60);
  const min = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

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
 * Submits to College Admin (`ScheduleChangeRequest`) + in-app notifications (no separate page).
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
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!academicPeriodId) return;
    setLoadingEntries(true);
    try {
      const res = await fetch(
        `/api/faculty/schedule-entries-for-change?periodId=${encodeURIComponent(academicPeriodId)}`,
        { credentials: "include" },
      );
      const data = (await res.json()) as {
        entries?: ScheduleEntryOption[];
        periodName?: string | null;
      };
      setEntries(data.entries ?? []);
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
  }, [open, initialScheduleEntryId]);

  /** Match requested slot length to the selected class (e.g. 3h lab → 3h proposed window). */
  useEffect(() => {
    if (!open || !scheduleEntryId || entries.length === 0) return;
    const sel = entries.find((e) => e.id === scheduleEntryId);
    if (!sel) return;
    const dur = Math.max(1, timeToMinutes(sel.endTime) - timeToMinutes(sel.startTime));
    setRequestedDay(sel.day);
    setRequestedStartTime(toTimeInputValue(sel.startTime));
    setRequestedEndTime(addMinutesToTimeInput(sel.startTime, dur));
  }, [open, scheduleEntryId, entries]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!scheduleEntryId) {
      setError("Select a class meeting to change.");
      toast.error("Failed to submit. Please try again.", "Select a class meeting to change.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/faculty/schedule-change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scheduleEntryId,
          requestedDay,
          requestedStartTime,
          requestedEndTime,
          reason,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setDone(true);
      toast.success("Request submitted successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
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
      <div className="relative z-[101] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-black/10 bg-white shadow-xl">
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
                College Admin will review and run a conflict check. Watch <strong>Announcements</strong> for status
                updates.
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
                  No schedule rows for you in this term. Nothing to request yet.
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
                      className="w-full h-11 rounded-lg border border-black/15 bg-white px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--color-opticore-orange)]/40"
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-black" htmlFor="fac-sc-day">
                        New day
                      </label>
                      <select
                        id="fac-sc-day"
                        className="w-full h-11 rounded-lg border border-black/15 bg-white px-3 text-sm"
                        value={requestedDay}
                        onChange={(e) => setRequestedDay(e.target.value)}
                      >
                        {WEEKDAYS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-black" htmlFor="fac-sc-start">
                        Start (24h)
                      </label>
                      <input
                        id="fac-sc-start"
                        type="time"
                        className="w-full h-11 rounded-lg border border-black/15 px-3 text-sm"
                        value={requestedStartTime}
                        onChange={(e) => setRequestedStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-black" htmlFor="fac-sc-end">
                        End (24h)
                      </label>
                      <input
                        id="fac-sc-end"
                        type="time"
                        className="w-full h-11 rounded-lg border border-black/15 px-3 text-sm"
                        value={requestedEndTime}
                        onChange={(e) => setRequestedEndTime(e.target.value)}
                      />
                    </div>
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
                      {submitting ? "Submitting…" : "Submit to College Admin"}
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
