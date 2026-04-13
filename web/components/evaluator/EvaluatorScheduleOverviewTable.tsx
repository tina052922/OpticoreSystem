import type { ScheduleEvaluatorTableRow } from "@/lib/evaluator/schedule-evaluator-table";

export type EvaluatorScheduleOverviewTableProps = {
  rows: ScheduleEvaluatorTableRow[];
  /** Campus-wide hub shows an extra College column. */
  showCollegeColumn?: boolean;
  /** Row ids with resource/time conflicts (from “Run full conflict check”). */
  highlightRowIds?: Set<string>;
  /** Strong focus ring + scroll target after “Show row in grid” from VPAA conflict list. */
  focusRowId?: string | null;
  /** Optional click handler (e.g. DOI opens quick-edit for that ScheduleEntry row). */
  onRowClick?: (rowId: string) => void;
  /**
   * Per-row hints for conflict columns (replaces generic “Yes”) after a campus-wide enriched scan.
   */
  conflictDetailsByRowId?: Map<string, { faculty?: string; section?: string; room?: string }>;
  /** Prefix for `id` on each `<tr>` (scrollIntoView from conflict tools). */
  rowDomIdPrefix?: string;
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
  focusRowId,
  onRowClick,
  conflictDetailsByRowId,
  rowDomIdPrefix = "eval-sched-row",
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
                const focused = focusRowId === row.id;
                const isVacantGec = vacantGecRowIds?.has(row.id) ?? false;
                const dimLocked = Boolean(dimNonVacantRows && vacantGecRowIds && !isVacantGec);
                const det = conflictDetailsByRowId?.get(row.id);
                const facCell = det?.faculty ?? row.facultyConflict;
                const secCell = det?.section ?? row.sectionConflict;
                const roomCell = det?.room ?? row.roomConflict;
                const rowRing = focused
                  ? "ring-2 ring-inset ring-blue-600 z-[1] relative bg-blue-50/90"
                  : conflictRow
                    ? "bg-red-100 ring-2 ring-inset ring-red-400/80"
                    : "";
                return (
                <tr
                  key={row.id}
                  id={`${rowDomIdPrefix}-${row.id}`}
                  className={`text-[11px] ${i % 2 === 0 ? "bg-white" : "bg-black/[0.02]"} ${rowRing} ${
                    isVacantGec
                      ? "border-l-[5px] border-l-emerald-500 bg-emerald-50/90 ring-1 ring-inset ring-emerald-300/60"
                      : ""
                  } ${
                    dimLocked ? "opacity-[0.52]" : ""
                  } ${onRowClick ? "cursor-pointer hover:bg-black/[0.04]" : ""}`}
                  onClick={onRowClick ? () => onRowClick(row.id) : undefined}
                  title={
                    conflictRow
                      ? "Conflicting row — click to edit (DOI) or use VPAA conflict list to suggest a fix."
                      : undefined
                  }
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
                  <td className="border border-black/10 px-2 py-2 text-red-700 max-w-[140px]" title={facCell || undefined}>
                    {facCell ? <span className="font-medium">{facCell}</span> : ""}
                  </td>
                  <td className="border border-black/10 px-2 py-2 text-red-700 max-w-[140px]" title={secCell || undefined}>
                    {secCell ? <span className="font-medium">{secCell}</span> : ""}
                  </td>
                  <td className="border border-black/10 px-2 py-2 text-red-700 max-w-[140px]" title={roomCell || undefined}>
                    {roomCell ? <span className="font-medium">{roomCell}</span> : ""}
                  </td>
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
