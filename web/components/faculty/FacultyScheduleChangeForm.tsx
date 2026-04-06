"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type EntryOption = {
  id: string;
  label: string;
  day: string;
  startTime: string;
  endTime: string;
  subjectCode: string;
  sectionName: string;
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Request a teaching schedule adjustment. Must select an existing plotted row (ScheduleEntry) for this faculty.
 */
export function FacultyScheduleChangeForm() {
  const [entries, setEntries] = useState<EntryOption[]>([]);
  const [periodName, setPeriodName] = useState<string | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [scheduleEntryId, setScheduleEntryId] = useState("");
  const [requestedDay, setRequestedDay] = useState("Monday");
  const [requestedStartTime, setRequestedStartTime] = useState("08:00");
  const [requestedEndTime, setRequestedEndTime] = useState("09:00");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingEntries(true);
      try {
        const res = await fetch("/api/faculty/schedule-entries-for-change", { credentials: "include" });
        const data = (await res.json()) as {
          entries?: EntryOption[];
          periodName?: string | null;
        };
        if (!cancelled) {
          setEntries(data.entries ?? []);
          setPeriodName(data.periodName ?? null);
        }
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoadingEntries(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!scheduleEntryId) {
      setError("Invalid request – No schedule found for this faculty.");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-6 text-emerald-950">
        <p className="font-semibold text-base mb-1">Request sent</p>
        <p className="text-sm text-emerald-900/90 leading-relaxed">
          Your schedule change request was sent to <strong>College Admin</strong> for review and conflict checking. You
          will receive an in-app notification when it is approved or rejected.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 border-emerald-300"
          onClick={() => {
            setDone(false);
            setReason("");
          }}
        >
          Submit another request
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      <p className="text-sm text-black/65 leading-relaxed">
        Select one of <strong>your current class meetings</strong> from the timetable (same term as{" "}
        {periodName ?? "the active period"}). The system only accepts changes that match an existing schedule row for
        you.
      </p>

      {loadingEntries ? (
        <p className="text-sm text-black/50">Loading your schedule…</p>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          No plotted schedule entries were found for you this term. You cannot submit a schedule change until your
          classes appear in the repository.
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-black" htmlFor="sc-entry">
              Class meeting to change <span className="text-red-700">*</span>
            </label>
            <select
              id="sc-entry"
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-black" htmlFor="sc-day">
                Requested day
              </label>
              <select
                id="sc-day"
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
              <label className="text-sm font-medium text-black" htmlFor="sc-start">
                Start (24h)
              </label>
              <input
                id="sc-start"
                type="time"
                className="w-full h-11 rounded-lg border border-black/15 px-3 text-sm"
                value={requestedStartTime}
                onChange={(e) => setRequestedStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-black" htmlFor="sc-end">
                End (24h)
              </label>
              <input
                id="sc-end"
                type="time"
                className="w-full h-11 rounded-lg border border-black/15 px-3 text-sm"
                value={requestedEndTime}
                onChange={(e) => setRequestedEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-black" htmlFor="sc-reason">
              Reason <span className="text-red-700">*</span>
            </label>
            <textarea
              id="sc-reason"
              required
              minLength={8}
              rows={5}
              placeholder="Explain why the change is needed."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-opticore-orange)]/40"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          ) : null}

          <Button
            type="submit"
            disabled={submitting || !scheduleEntryId}
            className="bg-[var(--color-opticore-orange)] hover:bg-[#e88909] text-white font-semibold px-8"
          >
            {submitting ? "Sending…" : "Submit request"}
          </Button>
        </>
      )}
    </form>
  );
}
