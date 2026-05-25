"use client";

import {
  useMemo,
  useCallback,
  useState,
  useEffect,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { AlertTriangle, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChairmanPlotScheduleModal } from "@/components/evaluator/ChairmanPlotScheduleModal";
import {
  BSIT_EVALUATOR_TIME_SLOTS,
  BSIT_EVALUATOR_WEEKDAYS,
  type BsitEvaluatorWeekday,
} from "@/lib/chairman/bsit-evaluator-constants";
import { scheduleDurationSlots, type BsitSemester } from "@/lib/chairman/bsit-prospectus";
import { prospectusRowForProgram } from "@/lib/chairman/prospectus-registry";
import { sortedNavigationBuildingKeysFromRooms } from "@/lib/campus/campus-navigation-catalog";
import { roomBuildingKey } from "@/lib/evaluator/room-by-building";
import type { PlotRow, RowConflictFlags } from "@/lib/evaluator/chairman-plot-row";
import { emptyPlotRow, normalizePlotRow } from "@/lib/evaluator/chairman-plot-row";
import { formatLecLabDisplay } from "@/lib/evaluator/chairman-plot-leclab";
import type { MajorOption } from "@/components/evaluator/ChairmanPlotScheduleModal";
import type { InstructorPlotOption } from "@/lib/evaluator/instructor-employee-id";
import type { Room, Section } from "@/types/db";

export type { RowConflictFlags };

function formatTimeRangeFromSlots(effectiveStart: number, dur: number): string {
  const slots = BSIT_EVALUATOR_TIME_SLOTS;
  const first = slots[effectiveStart];
  const last = slots[effectiveStart + dur - 1];
  if (!first || !last) return "—";
  const start = first.label.split(" - ")[0] ?? "";
  const end = last.label.split(" - ").pop() ?? "";
  return `${start} – ${end}`;
}

function rowTimeBounds(
  row: PlotRow,
  programCodeForSummary: string,
): { startIdx: number; dur: number } | null {
  const p = row.subjectCode ? prospectusRowForProgram(programCodeForSummary, row.subjectCode) : undefined;
  if (!p) return null;
  const dur = scheduleDurationSlots(p);
  const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - dur;
  const startIdx = Math.min(row.startSlotIndex, maxS);
  if (startIdx < 0 || startIdx + dur > BSIT_EVALUATOR_TIME_SLOTS.length) return null;
  return { startIdx, dur };
}

function cellConflictClasses(
  cf: RowConflictFlags,
  scanHit: boolean,
  policyHit: boolean,
  selected: boolean,
): string {
  const parts: string[] = [
    "border border-black align-top text-black transition-all duration-150",
  ];
  if (selected) {
    parts.push("ring-2 ring-[#ff990a] ring-inset bg-[#ff990a]/12 shadow-sm");
  }
  if (scanHit || policyHit) {
    parts.push("bg-red-50/95 ring-2 ring-inset ring-red-400/90");
    return parts.join(" ");
  }
  if (cf.faculty === "Yes" || cf.room === "Yes" || cf.section === "Yes") {
    parts.push("bg-red-50/80 ring-2 ring-inset ring-red-300/70");
    if (cf.faculty === "Yes") parts.push("shadow-[inset_3px_0_0_0_#dc2626]");
    if (cf.room === "Yes") parts.push("shadow-[inset_0_3px_0_0_#ea580c]");
    if (cf.section === "Yes") parts.push("shadow-[inset_0_-3px_0_0_#7c3aed]");
    return parts.join(" ");
  }
  return parts.join(" ");
}

type CellAnchor = { day: BsitEvaluatorWeekday; slotIdx: number };

type ModalSession = {
  draft: PlotRow;
  buildingValue: string;
  isNew: boolean;
  anchor: CellAnchor;
};

/** Primary schedule actions grouped in the grid header (UI only — handlers live in the worksheet). */
export type ChairmanGridPlottingActions = {
  onRunConflictCheck: () => void;
  onSaveSchedule: () => void;
  runConflictCheckDisabled?: boolean;
  saveScheduleDisabled?: boolean;
  saveScheduleBusy?: boolean;
  connOnline?: boolean;
  lastDraftSaveAt?: Date | null;
};

export type BsitChairmanInteractiveWeekGridProps = {
  rows: PlotRow[];
  programCodeForSummary: string;
  majorOptions: MajorOption[];
  programSections: Section[];
  selectedSectionId: string;
  schedulePublished: boolean;
  instructorPlotOptions: InstructorPlotOption[];
  roomsForEvaluatorGrid: Room[];
  roomById: Map<string, Room>;
  roomBuildingByRowId: Record<string, string>;
  setRoomBuildingByRowId: Dispatch<SetStateAction<Record<string, string>>>;
  sectionNameById: Map<string, string>;
  instructorDisplayById: Map<string, string>;
  roomCodeById: Map<string, string>;
  termProspectusSemester: BsitSemester | null;
  plottedCodesBySectionId: Map<string, Set<string>>;
  conflictForRow: (row: PlotRow) => RowConflictFlags;
  campusScanConflictIds: Set<string>;
  overloadedInstructorIds: Set<string>;
  onApplyPlot: (draft: PlotRow, buildingValue: string) => void;
  onRemoveRow: (id: string) => void;
  insFormBasePath?: string;
  /** Run conflict check + Save schedule beside Generate INS Form. */
  plottingActions?: ChairmanGridPlottingActions;
  /** Messages, conflict detail, etc. below the scrollable grid (same card). */
  gridFooter?: ReactNode;
};

function PlotCellSummary({
  row,
  programCodeForSummary,
  sectionNameById,
  roomCodeById,
  instructorDisplayById,
  conflictFlags,
}: {
  row: PlotRow;
  programCodeForSummary: string;
  sectionNameById: Map<string, string>;
  roomCodeById: Map<string, string>;
  instructorDisplayById: Map<string, string>;
  conflictFlags: RowConflictFlags;
}) {
  const pr = row.subjectCode ? prospectusRowForProgram(programCodeForSummary, row.subjectCode) : undefined;
  const dur = pr ? scheduleDurationSlots(pr) : 1;
  const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - dur;
  const eff = pr ? Math.min(row.startSlotIndex, maxS) : 0;
  const sec = row.sectionId ? (sectionNameById.get(row.sectionId) ?? "") : "";
  const room = row.roomId ? (roomCodeById.get(row.roomId) ?? "") : "";
  const inst = row.instructorId ? (instructorDisplayById.get(row.instructorId) ?? "") : "";
  const hasConflict =
    conflictFlags.faculty === "Yes" || conflictFlags.room === "Yes" || conflictFlags.section === "Yes";

  return (
    <div
      id={`chairman-eval-row-${row.id}`}
      className={`w-full text-left rounded-md px-1.5 py-1.5 leading-tight transition-colors ${
        hasConflict ? "border border-red-300/80 bg-red-50/40" : "border border-transparent"
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] font-bold text-[#780301]">{programCodeForSummary}</span>
        {row.subjectCode ? (
          <span className="text-[8px] font-semibold text-black/50">{formatLecLabDisplay(row.lecLabMode)}</span>
        ) : null}
      </div>
      {row.subjectCode ? (
        <span className="text-[10px] font-bold text-black block truncate">{row.subjectCode}</span>
      ) : (
        <span className="text-[9px] text-black/40 italic">Tap to complete…</span>
      )}
      {sec ? <span className="text-[8px] text-black/70 block truncate">{sec}</span> : null}
      {room ? <span className="text-[8px] text-black/55 block truncate">{room}</span> : null}
      {inst ? <span className="text-[8px] text-black/55 block truncate">{inst}</span> : null}
      {pr ? (
        <span className="text-[8px] text-black/45 tabular-nums">{formatTimeRangeFromSlots(eff, dur)}</span>
      ) : null}
      {hasConflict ? (
        <span className="text-[7px] font-bold text-red-800 mt-0.5 block">Conflict</span>
      ) : null}
    </div>
  );
}

/**
 * Chairman Evaluator: INS weekly grid with modal-based plotting (clean cells, full form in popup).
 */
export function BsitChairmanInteractiveWeekGrid({
  rows,
  programCodeForSummary,
  majorOptions,
  programSections,
  selectedSectionId,
  schedulePublished,
  instructorPlotOptions,
  roomsForEvaluatorGrid,
  roomById,
  roomBuildingByRowId,
  setRoomBuildingByRowId,
  sectionNameById,
  instructorDisplayById,
  roomCodeById,
  termProspectusSemester,
  plottedCodesBySectionId,
  conflictForRow,
  campusScanConflictIds,
  overloadedInstructorIds,
  onApplyPlot,
  onRemoveRow,
  insFormBasePath = "/chairman/ins",
  plottingActions,
  gridFooter,
}: BsitChairmanInteractiveWeekGridProps) {
  const slots = BSIT_EVALUATOR_TIME_SLOTS;
  const buildingLabelsForGrid = useMemo(
    () => sortedNavigationBuildingKeysFromRooms(roomsForEvaluatorGrid),
    [roomsForEvaluatorGrid],
  );

  const [highlightedCell, setHighlightedCell] = useState<CellAnchor | null>(null);
  const [modal, setModal] = useState<ModalSession | null>(null);

  /** Keep cell highlight aligned while day/time change inside the modal. */
  useEffect(() => {
    if (!modal) return;
    setHighlightedCell({ day: modal.draft.day, slotIdx: modal.draft.startSlotIndex });
  }, [modal?.draft.day, modal?.draft.startSlotIndex, modal]);

  const filteredRows = useMemo(
    () => (selectedSectionId ? rows.filter((r) => r.sectionId === selectedSectionId) : rows),
    [rows, selectedSectionId],
  );

  const skipSlot = useMemo(() => {
    const m = new Set<string>();
    for (const row of filteredRows) {
      const bounds = rowTimeBounds(row, programCodeForSummary);
      if (!bounds || !row.sectionId || !row.subjectCode) continue;
      for (let k = 1; k < bounds.dur; k++) {
        m.add(`${row.day}-${bounds.startIdx + k}`);
      }
    }
    return m;
  }, [filteredRows, programCodeForSummary]);

  const unplacedRows = useMemo(
    () =>
      filteredRows.filter((r) => {
        if (!r.sectionId && !r.subjectCode) return true;
        return rowTimeBounds(r, programCodeForSummary) == null;
      }),
    [filteredRows, programCodeForSummary],
  );

  const insSectionId =
    selectedSectionId || filteredRows.find((r) => r.sectionId)?.sectionId || rows.find((r) => r.sectionId)?.sectionId || "";
  const insPrintHref = insSectionId
    ? `${insFormBasePath}?tab=section&sectionId=${encodeURIComponent(insSectionId)}&print=1`
    : `${insFormBasePath}?tab=section`;

  const openModalForRow = useCallback(
    (row: PlotRow, anchor: CellAnchor, isNew: boolean) => {
      if (schedulePublished || row.lockedByDoiAt) return;
      const pickedRoom = row.roomId ? roomById.get(row.roomId) : undefined;
      const buildingValue = roomBuildingByRowId[row.id] ?? (pickedRoom ? roomBuildingKey(pickedRoom) : "");
      setHighlightedCell(anchor);
      setModal({
        draft: normalizePlotRow({ ...row }, programCodeForSummary),
        buildingValue,
        isNew,
        anchor,
      });
    },
    [schedulePublished, roomById, roomBuildingByRowId],
  );

  const openModalForEmptyCell = useCallback(
    (day: BsitEvaluatorWeekday, slotIdx: number) => {
      if (schedulePublished) return;
      const draft: PlotRow = normalizePlotRow(
        {
          ...emptyPlotRow(),
          day,
          startSlotIndex: slotIdx,
          sectionId: selectedSectionId || "",
        },
        programCodeForSummary,
      );
      setHighlightedCell({ day, slotIdx });
      setModal({ draft, buildingValue: "", isNew: true, anchor: { day, slotIdx } });
    },
    [schedulePublished, selectedSectionId],
  );

  const closeModal = useCallback(() => {
    setModal(null);
    setHighlightedCell(null);
  }, []);

  const handleApply = useCallback(() => {
    if (!modal) return;
    onApplyPlot(modal.draft, modal.buildingValue);
    closeModal();
  }, [modal, onApplyPlot, closeModal]);

  const handleRemove = useCallback(() => {
    if (!modal || modal.isNew) return;
    onRemoveRow(modal.draft.id);
    closeModal();
  }, [modal, onRemoveRow, closeModal]);

  const modalConflictFlags = modal ? conflictForRow(modal.draft) : { faculty: "—", room: "—", section: "—" };

  const anchorLabel = modal
    ? `${modal.draft.day} · ${BSIT_EVALUATOR_TIME_SLOTS[modal.draft.startSlotIndex]?.label ?? "Time slot"}`
    : "";

  const isCellSelected = (day: BsitEvaluatorWeekday, slotIdx: number) =>
    highlightedCell?.day === day && highlightedCell?.slotIdx === slotIdx;

  return (
    <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden border border-black/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-black">Schedule preview (INS weekly grid)</div>
          <p className="text-[12px] text-black/55 mt-1">
            Monday–Friday · 7:00 AM–5:00 PM · Click a cell to plot or edit · Merged cells follow subject duration
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {plottingActions ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="border-amber-300 bg-white font-bold shrink-0 h-9 text-xs"
                disabled={plottingActions.runConflictCheckDisabled}
                onClick={() => plottingActions.onRunConflictCheck()}
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 inline" aria-hidden />
                Run conflict check (campus-wide)
              </Button>
              <Button
                type="button"
                className="bg-[#780301] hover:bg-[#5a0201] text-white font-bold shrink-0 h-9 text-xs disabled:opacity-50"
                disabled={plottingActions.saveScheduleDisabled || plottingActions.saveScheduleBusy}
                onClick={() => plottingActions.onSaveSchedule()}
              >
                <Save className="w-3.5 h-3.5 mr-1.5 inline" aria-hidden />
                {plottingActions.saveScheduleBusy ? "Saving…" : "Save schedule"}
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            className="bg-[#780301] hover:bg-[#5a0201] text-white font-bold h-9 text-xs shrink-0"
            disabled={!insSectionId}
            onClick={() => window.open(insPrintHref, "_blank", "noopener,noreferrer")}
          >
            Generate INS Form
          </Button>
          {plottingActions ? (
            <div className="flex flex-col items-end gap-0.5 text-[10px] text-black/55 min-w-[140px]">
              <span className="font-semibold text-black/70">
                {plottingActions.connOnline !== false ? (
                  <span className="text-emerald-800">Online</span>
                ) : (
                  <span className="text-red-800">Offline</span>
                )}
                <span className="text-black/45 font-normal"> · Autosave ~9s</span>
              </span>
              <span className="tabular-nums">
                {plottingActions.lastDraftSaveAt
                  ? `Last draft sync: ${plottingActions.lastDraftSaveAt.toLocaleTimeString()}`
                  : "Last draft sync: —"}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {!insSectionId ? (
        <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          Plot at least one row with a section to generate the printable INS Form 5B.
        </p>
      ) : null}

      {unplacedRows.length > 0 ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
          <p className="text-[11px] font-semibold text-amber-950">Incomplete plots — click to finish in the form</p>
          <ul className="flex flex-wrap gap-2">
            {unplacedRows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  disabled={schedulePublished || Boolean(row.lockedByDoiAt)}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-[11px] font-medium text-amber-950 hover:bg-amber-50 disabled:opacity-50"
                  onClick={() =>
                    openModalForRow(row, { day: row.day, slotIdx: row.startSlotIndex }, !rows.some((r) => r.id === row.id))
                  }
                >
                  {row.subjectCode || row.sectionId ? "Continue plotting…" : "New plot…"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto max-h-[min(70vh,720px)] overflow-y-auto">
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <th className="border border-black bg-[#ff990a] text-white px-1 py-1 w-[72px] font-bold">TIME</th>
              {BSIT_EVALUATOR_WEEKDAYS.map((day) => (
                <th key={day} className="border border-black bg-[#ff990a] text-white px-1 py-1 min-w-[100px] font-bold">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, slotIdx) => (
              <tr key={slot.label}>
                <td className="border border-black px-1 py-1.5 text-center whitespace-nowrap text-black bg-white/95">
                  {slot.label}
                </td>
                {BSIT_EVALUATOR_WEEKDAYS.map((day) => {
                  if (skipSlot.has(`${day}-${slotIdx}`)) return null;
                  const atHere = filteredRows.filter((r) => {
                    const bounds = rowTimeBounds(r, programCodeForSummary);
                    if (!bounds) return r.day === day && r.startSlotIndex === slotIdx;
                    if (!r.sectionId || !r.subjectCode) return false;
                    return r.day === day && bounds.startIdx === slotIdx;
                  });
                  const selected = isCellSelected(day, slotIdx);

                  if (atHere.length === 0) {
                    return (
                      <td
                        key={day}
                        className={`border border-black px-0.5 py-0.5 align-top min-h-[44px] ${cellConflictClasses(
                          { faculty: "No", room: "No", section: "No" },
                          false,
                          false,
                          selected,
                        )}`}
                      >
                        <button
                          type="button"
                          disabled={schedulePublished}
                          className="w-full min-h-[40px] rounded border border-dashed border-black/20 text-black/30 hover:border-[#ff990a] hover:text-[#ff990a] hover:bg-[#ff990a]/5 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-0.5 transition-colors"
                          aria-label={`Plot schedule on ${day} at ${slot.label}`}
                          onClick={() => openModalForEmptyCell(day, slotIdx)}
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden />
                        </button>
                      </td>
                    );
                  }

                  const rowspan = Math.max(
                    ...atHere.map((r) => {
                      const bounds = rowTimeBounds(r, programCodeForSummary);
                      return bounds?.dur ?? 1;
                    }),
                  );
                  const cfMerged = atHere.map((r) => conflictForRow(r));
                  const scanHit = atHere.some((r) => campusScanConflictIds.has(r.id));
                  const policyHit = atHere.some(
                    (r) => Boolean(r.instructorId) && overloadedInstructorIds.has(r.instructorId),
                  );
                  const mergedCf: RowConflictFlags = {
                    faculty: cfMerged.some((c) => c.faculty === "Yes") ? "Yes" : "No",
                    room: cfMerged.some((c) => c.room === "Yes") ? "Yes" : "No",
                    section: cfMerged.some((c) => c.section === "Yes") ? "Yes" : "No",
                  };

                  return (
                    <td
                      key={day}
                      rowSpan={rowspan}
                      className={`px-0.5 py-0.5 min-w-[100px] ${cellConflictClasses(mergedCf, scanHit, policyHit, selected)}`}
                    >
                      <ul className="space-y-1">
                        {atHere.map((r) => {
                          const bounds = rowTimeBounds(r, programCodeForSummary);
                          const anchor: CellAnchor = {
                            day: r.day,
                            slotIdx: bounds?.startIdx ?? r.startSlotIndex,
                          };
                          return (
                            <li key={r.id}>
                              <div
                                onClick={() =>
                                  openModalForRow(r, anchor, false)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    openModalForRow(r, anchor, false);
                                  }
                                }}
                                role="button"
                                tabIndex={schedulePublished || r.lockedByDoiAt ? -1 : 0}
                                className={schedulePublished || r.lockedByDoiAt ? "pointer-events-none opacity-70" : ""}
                              >
                                <PlotCellSummary
                                  row={r}
                                  programCodeForSummary={programCodeForSummary}
                                  sectionNameById={sectionNameById}
                                  roomCodeById={roomCodeById}
                                  instructorDisplayById={instructorDisplayById}
                                  conflictFlags={conflictForRow(r)}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {gridFooter ? <div className="mt-4 space-y-3 border-t border-black/10 pt-4">{gridFooter}</div> : null}

      <ChairmanPlotScheduleModal
        open={modal != null}
        onClose={closeModal}
        draft={modal?.draft ?? emptyPlotRow()}
        onDraftChange={(next) => setModal((m) => (m ? { ...m, draft: next } : m))}
        buildingValue={modal?.buildingValue ?? ""}
        onBuildingChange={(b) => setModal((m) => (m ? { ...m, buildingValue: b } : m))}
        programCodeForSummary={programCodeForSummary}
        majorOptions={majorOptions}
        programSections={programSections}
        instructorPlotOptions={instructorPlotOptions}
        roomsForEvaluatorGrid={roomsForEvaluatorGrid}
        buildingLabelsForGrid={buildingLabelsForGrid}
        sectionNameById={sectionNameById}
        termProspectusSemester={termProspectusSemester}
        plottedCodesBySectionId={plottedCodesBySectionId}
        conflictFlags={modalConflictFlags}
        readOnly={schedulePublished || Boolean(modal?.draft.lockedByDoiAt)}
        isNewPlot={modal?.isNew ?? true}
        anchorLabel={anchorLabel}
        onApply={handleApply}
        onRemove={modal && !modal.isNew ? handleRemove : undefined}
      />
    </div>
  );
}
