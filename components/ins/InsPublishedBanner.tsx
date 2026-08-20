"use client";

/**
 * Shown when the VPAA has published the master schedule for the selected term (ScheduleEntry.lockedByDoiAt set).
 * Keeps the same neutral INS card styling as the rest of the form.
 */
export function InsPublishedBanner({ periodLabel }: { periodLabel: string }) {
  return (
    <div
      className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950"
      role="status"
    >
      <p className="font-semibold">Published master schedule</p>
      <p className="mt-0.5 text-emerald-900/90">
        VPAA has published and locked schedules for <strong>{periodLabel}</strong>. Timetable data below is final;
        edits are disabled until a new planning cycle.
      </p>
    </div>
  );
}
