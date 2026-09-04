"use client";

/**
 * Shown when DOI has published and locked the master schedule for the selected term
 * (`ScheduleEntry.lockedByDoiAt` set). Editors stay read-only until DOI unpublishes / unlocks.
 */
export function InsPublishedBanner({ periodLabel }: { periodLabel: string }) {
  return (
    <div
      className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950"
      role="status"
    >
      <p className="font-semibold">Published master schedule</p>
      <p className="mt-0.5 text-emerald-900/90">
        DOI has published and locked schedules for <strong>{periodLabel}</strong>. Timetable data below is
        final. Case-to-case edits resume only after DOI unpublishes / unlocks this term.
      </p>
    </div>
  );
}
