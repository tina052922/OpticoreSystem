import type { ScheduleEvaluatorTableRow } from "@/lib/evaluator/schedule-evaluator-table";

export type EvaluatorScheduleOverviewTableProps = {
  rows: ScheduleEvaluatorTableRow[];
  /** Campus-wide hub shows an extra College column. */
  showCollegeColumn?: boolean;
  /** Row ids with resource/time conflicts (from “Run full conflict check”). */
  highlightRowIds?: Set<string>;
  /** GEC Central Hub: rows that are vacant GEC/GEE placeholders (editable when approved). */
  vacantGecRowIds?: Set<string>;
  /** When true, non-`vacantGecRowIds` rows render muted to emphasize locked major schedules. */
  dimNonVacantRows?: boolean;
};

/**
 * Shared orange-striped schedule grid used on Central Hub and Chairman Evaluator.
 */
export function EvaluatorScheduleOverviewTable({
  rows,
  showCollegeColumn,
  highlightRowIds,
  vacantGecRowIds,
  dimNonVacantRows,
}: EvaluatorScheduleOverviewTableProps) {
  const headers = showCollegeColumn
    ? [
        "College",
        "Major",
        "Section",
        "Students",
        "Subject Code",
        "Instructor",
        "Room",
        "Time",
        "Day",
        "Faculty Conflict",
        "Section Conflict",
        "Room Conflict",
      ]
    : [
        "Major",
        "Section",
        "Students",
        "Subject Code",
        "Instructor",
        "Room",
        "Time",
        "Day",
        "Faculty Conflict",
        "Section Conflict",
        "Room Conflict",
      ];

  const colSpan = showCollegeColumn ? 12 : 11;

  return (
    <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden">
      <p className="lg:hidden px-3 py-2 text-[11px] text-black/50 border-b border-black/5">
        Swipe horizontally to see all columns.
      </p>
      <div className="overflow-x-auto overflow-x-touch-pan">
        <table className="w-full border-collapse min-w-[960px]">
          <thead>
            <tr className="bg-[#ff990a] text-white text-[11px]">
              {headers.map((h) => (
                <th key={h} className="border border-black/10 px-2 py-2.5 text-left font-bold">
                  {h} ▾
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-[13px] text-black/50">
                  No schedule rows for this scope and term in the database.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const conflictRow = highlightRowIds?.has(row.id);
                const isVacantGec = vacantGecRowIds?.has(row.id) ?? false;
                const dimLocked = Boolean(dimNonVacantRows && vacantGecRowIds && !isVacantGec);
                return (
                <tr
                  key={row.id}
                  className={`text-[11px] ${i % 2 === 0 ? "bg-white" : "bg-black/[0.02]"} ${
                    conflictRow ? "bg-red-100 ring-2 ring-inset ring-red-400/80" : ""
                  } ${isVacantGec ? "border-l-[5px] border-l-[#FF990A] bg-amber-50/40" : ""} ${
                    dimLocked ? "opacity-[0.52]" : ""
                  }`}
                >
                  {showCollegeColumn ? (
                    <td className="border border-black/10 px-2 py-2 max-w-[140px] truncate" title={row.college}>
                      {row.college}
                    </td>
                  ) : null}
                  <td className="border border-black/10 px-2 py-2">{row.major}</td>
                  <td className="border border-black/10 px-2 py-2 font-medium">{row.section}</td>
                  <td className="border border-black/10 px-2 py-2 tabular-nums">{row.students}</td>
                  <td className="border border-black/10 px-2 py-2">{row.subjectCode}</td>
                  <td className="border border-black/10 px-2 py-2">{row.instructor}</td>
                  <td className="border border-black/10 px-2 py-2">{row.room}</td>
                  <td className="border border-black/10 px-2 py-2 tabular-nums whitespace-nowrap">{row.time}</td>
                  <td className="border border-black/10 px-2 py-2">{row.day}</td>
                  <td className="border border-black/10 px-2 py-2 text-red-700">{row.facultyConflict}</td>
                  <td className="border border-black/10 px-2 py-2 text-red-700">{row.sectionConflict}</td>
                  <td className="border border-black/10 px-2 py-2 text-red-700">{row.roomConflict}</td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
