"use client";

import { useMemo, useCallback, type Dispatch, type SetStateAction } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BSIT_EVALUATOR_TIME_SLOTS,
  BSIT_EVALUATOR_WEEKDAYS,
  type BsitEvaluatorWeekday,
} from "@/lib/chairman/bsit-evaluator-constants";
import {
  normalizeProspectusCode,
  scheduleDurationSlots,
  type BsitSemester,
} from "@/lib/chairman/bsit-prospectus";
import {
  prospectusRowForProgram,
  prospectusSubjectsForProgramYearAndSemester,
  prospectusSubjectsForProgramYearLevel,
} from "@/lib/chairman/prospectus-registry";
import { yearLevelFromSchedulingSectionName } from "@/lib/chairman/section-year-level";
import {
  campusNavigationBuildingOptionLabel,
  sortedNavigationBuildingKeysFromRooms,
} from "@/lib/campus/campus-navigation-catalog";
import {
  formatInstructorPlotOptionLabel,
  type InstructorPlotOption,
} from "@/lib/evaluator/instructor-employee-id";
import {
  formatRoomOptionLabel,
  roomBuildingKey,
  roomsInBuildingSorted,
} from "@/lib/evaluator/room-by-building";
import type { Room, Section } from "@/types/db";
import type { PlotRow } from "@/lib/evaluator/chairman-plot-row";

const selectClass =
  "w-full min-h-9 rounded-md border border-black/25 bg-white px-2 text-[11px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";

const daySelectClass =
  "w-full min-h-9 min-w-0 rounded-md border border-black/25 bg-white px-2 text-[11px] font-medium text-neutral-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";

function formatTimeRangeFromSlots(effectiveStart: number, dur: number): { fullLine: string; slotLines: string[] } {
  const slots = BSIT_EVALUATOR_TIME_SLOTS;
  const first = slots[effectiveStart];
  const last = slots[effectiveStart + dur - 1];
  if (!first || !last) return { fullLine: "—", slotLines: [] };
  const start = first.label.split(" - ")[0] ?? "";
  const end = last.label.split(" - ").pop() ?? "";
  const slotLines = Array.from({ length: dur }, (_, k) => slots[effectiveStart + k]?.label ?? "").filter(Boolean);
  return { fullLine: `${start} – ${end}`, slotLines };
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

export type RowConflictFlags = { faculty: string; room: string; section: string };

export type BsitChairmanInteractiveWeekGridProps = {
  rows: PlotRow[];
  programCodeForSummary: string;
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
  termProspectusSemester: BsitSemester | null;
  plottedCodesBySectionId: Map<string, Set<string>>;
  conflictForRow: (row: PlotRow) => RowConflictFlags;
  campusScanConflictIds: Set<string>;
  overloadedInstructorIds: Set<string>;
  commitRowPatch: (id: string, patch: Partial<PlotRow>) => void;
  updateRow: (id: string, patch: Partial<PlotRow>) => void;
  removeRow: (id: string) => void;
  onPlotAtSlot: (day: BsitEvaluatorWeekday, startSlotIndex: number) => void;
  insFormBasePath?: string;
};

function lecLabLabel(programCode: string, subjectCode: string): string {
  const p = prospectusRowForProgram(programCode, subjectCode);
  if (!p) return "—";
  if (p.labUnits > 0 && p.lecUnits > 0) return "Lec + Lab";
  if (p.labUnits > 0) return "Lab";
  return "Lec";
}

function cellConflictClasses(cf: RowConflictFlags, scanHit: boolean, policyHit: boolean): string {
  const parts: string[] = ["border border-black align-top text-black transition-colors"];
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

type PlotBlockEditorProps = {
  row: PlotRow;
  programCodeForSummary: string;
  programSections: Section[];
  instructorPlotOptions: InstructorPlotOption[];
  roomsForEvaluatorGrid: Room[];
  buildingLabelsForGrid: string[];
  roomById: Map<string, Room>;
  roomBuildingByRowId: Record<string, string>;
  setRoomBuildingByRowId: Dispatch<SetStateAction<Record<string, string>>>;
  instructorDisplayById: Map<string, string>;
  sectionNameById: Map<string, string>;
  termProspectusSemester: BsitSemester | null;
  plottedCodesBySectionId: Map<string, Set<string>>;
  rowReadOnly: boolean;
  conflictFlags: RowConflictFlags;
  commitRowPatch: (id: string, patch: Partial<PlotRow>) => void;
  updateRow: (id: string, patch: Partial<PlotRow>) => void;
  removeRow: (id: string) => void;
};

function PlotBlockEditor({
  row,
  programCodeForSummary,
  programSections,
  instructorPlotOptions,
  roomsForEvaluatorGrid,
  buildingLabelsForGrid,
  roomById,
  roomBuildingByRowId,
  setRoomBuildingByRowId,
  instructorDisplayById,
  sectionNameById,
  termProspectusSemester,
  plottedCodesBySectionId,
  rowReadOnly,
  conflictFlags,
  commitRowPatch,
  updateRow,
  removeRow,
}: PlotBlockEditorProps) {
  const pr = row.subjectCode ? prospectusRowForProgram(programCodeForSummary, row.subjectCode) : undefined;
  const dur = pr ? scheduleDurationSlots(pr) : 1;
  const maxStart = BSIT_EVALUATOR_TIME_SLOTS.length - dur;
  const effectiveStart = Math.min(row.startSlotIndex, maxStart);
  const timeFmt = formatTimeRangeFromSlots(effectiveStart, dur);
  const sectionName = row.sectionId ? (sectionNameById.get(row.sectionId) ?? "") : "";
  const yearLevel = sectionName ? yearLevelFromSchedulingSectionName(sectionName) : null;
  const subjectOptions =
    yearLevel == null
      ? []
      : termProspectusSemester != null
        ? prospectusSubjectsForProgramYearAndSemester(programCodeForSummary, yearLevel, termProspectusSemester)
        : prospectusSubjectsForProgramYearLevel(programCodeForSummary, yearLevel);

  const pickedRoom = row.roomId ? roomById.get(row.roomId) : undefined;
  const inferredBuilding = pickedRoom ? roomBuildingKey(pickedRoom) : "";
  const buildingValue = roomBuildingByRowId[row.id] ?? inferredBuilding;
  const roomsInB = buildingValue ? roomsInBuildingSorted(roomsForEvaluatorGrid, buildingValue) : [];

  const hasConflict =
    conflictFlags.faculty === "Yes" || conflictFlags.room === "Yes" || conflictFlags.section === "Yes";

  return (
    <li
      id={`chairman-eval-row-${row.id}`}
      className={`rounded-md border p-1.5 space-y-1 leading-tight ${
        hasConflict ? "border-red-300 bg-red-50/50" : "border-black/15 bg-white/90"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-1">
        <span className="text-[9px] font-bold text-[#780301]">{programCodeForSummary}</span>
        {pr ? (
          <span className="text-[8px] font-semibold px-1 py-0.5 rounded bg-[#ff990a]/15 text-[#780301]">
            {lecLabLabel(programCodeForSummary, row.subjectCode)}
          </span>
        ) : null}
      </div>

      {(conflictFlags.faculty === "Yes" || conflictFlags.room === "Yes" || conflictFlags.section === "Yes") && (
        <div className="flex flex-wrap gap-0.5">
          {conflictFlags.faculty === "Yes" ? (
            <span className="text-[8px] font-bold text-red-800 bg-red-100 px-1 rounded">Faculty conflict</span>
          ) : null}
          {conflictFlags.room === "Yes" ? (
            <span className="text-[8px] font-bold text-orange-900 bg-orange-100 px-1 rounded">Room conflict</span>
          ) : null}
          {conflictFlags.section === "Yes" ? (
            <span className="text-[8px] font-bold text-violet-900 bg-violet-100 px-1 rounded">Section conflict</span>
          ) : null}
        </div>
      )}

      <select
        className={selectClass}
        value={row.sectionId}
        disabled={rowReadOnly}
        aria-label="Section"
        onChange={(e) => {
          const sectionId = e.target.value;
          const name = programSections.find((s) => s.id === sectionId)?.name ?? "";
          const yl = yearLevelFromSchedulingSectionName(name);
          let subjectCode = row.subjectCode;
          if (subjectCode && yl != null) {
            const s = prospectusRowForProgram(programCodeForSummary, subjectCode);
            const sem = termProspectusSemester;
            if (!s || s.yearLevel !== yl) subjectCode = "";
            else if (sem != null && s.semester !== sem) subjectCode = "";
          }
          commitRowPatch(row.id, { sectionId, subjectCode });
        }}
      >
        <option value="">Section…</option>
        {programSections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={row.subjectCode}
        disabled={rowReadOnly || !row.sectionId || yearLevel == null}
        aria-label="Subject code"
        onChange={(e) => {
          const subjectCode = e.target.value;
          const p = subjectCode ? prospectusRowForProgram(programCodeForSummary, subjectCode) : undefined;
          let startSlotIndex = row.startSlotIndex;
          if (p) {
            const d = scheduleDurationSlots(p);
            const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - d;
            if (startSlotIndex > maxS) startSlotIndex = maxS;
          }
          commitRowPatch(row.id, { subjectCode, startSlotIndex });
        }}
      >
        <option value="">{!row.sectionId ? "Select section…" : "Subject…"}</option>
        {(() => {
          const plotted = row.sectionId ? plottedCodesBySectionId.get(row.sectionId) : undefined;
          const available = subjectOptions.filter(
            (s) => !plotted || !plotted.has(normalizeProspectusCode(s.code)) || s.code === row.subjectCode,
          );
          const already = subjectOptions.filter(
            (s) => plotted && plotted.has(normalizeProspectusCode(s.code)) && s.code !== row.subjectCode,
          );
          return (
            <>
              {available.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code}
                </option>
              ))}
              {already.map((s) => (
                <option key={s.code} value={s.code} disabled>
                  ✓ {s.code}
                </option>
              ))}
            </>
          );
        })()}
      </select>

      <select
        className={selectClass}
        value={row.instructorId}
        disabled={rowReadOnly}
        aria-label="Instructor"
        onChange={(e) => commitRowPatch(row.id, { instructorId: e.target.value })}
      >
        <option value="">Instructor…</option>
        {instructorPlotOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {formatInstructorPlotOptionLabel(opt)}
          </option>
        ))}
      </select>
      {row.instructorId && instructorDisplayById.get(row.instructorId) ? (
        <span className="text-[8px] text-black/55 block truncate">{instructorDisplayById.get(row.instructorId)}</span>
      ) : null}

      <div className="flex flex-col gap-1">
        <select
          className={selectClass}
          value={buildingValue}
          disabled={rowReadOnly}
          aria-label="Building"
          onChange={(e) => {
            const b = e.target.value;
            setRoomBuildingByRowId((prev) => ({ ...prev, [row.id]: b }));
            const keep =
              row.roomId && roomsForEvaluatorGrid.some((r) => r.id === row.roomId && roomBuildingKey(r) === b);
            if (!keep) commitRowPatch(row.id, { roomId: "" });
          }}
        >
          <option value="">Building…</option>
          {buildingLabelsForGrid.map((b) => (
            <option key={b} value={b}>
              {campusNavigationBuildingOptionLabel(b)}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={row.roomId}
          disabled={rowReadOnly || !buildingValue}
          aria-label="Room"
          onChange={(e) => {
            const id = e.target.value;
            const r = roomsForEvaluatorGrid.find((x) => x.id === id);
            setRoomBuildingByRowId((prev) => ({
              ...prev,
              [row.id]: r ? roomBuildingKey(r) : prev[row.id] ?? "",
            }));
            commitRowPatch(row.id, { roomId: id });
          }}
        >
          <option value="">{buildingValue ? "Room…" : "Building first"}</option>
          {roomsInB.map((r) => (
            <option key={r.id} value={r.id}>
              {formatRoomOptionLabel(r)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1 items-center">
        <select
          className={`${daySelectClass} flex-1 min-w-[72px]`}
          value={row.day}
          disabled={rowReadOnly}
          aria-label="Day"
          onChange={(e) => commitRowPatch(row.id, { day: e.target.value as BsitEvaluatorWeekday })}
        >
          {BSIT_EVALUATOR_WEEKDAYS.map((d) => (
            <option key={d} value={d}>
              {d.slice(0, 3)}
            </option>
          ))}
        </select>
        <select
          className={`${selectClass} flex-1 min-w-[72px]`}
          aria-label="Start time"
          value={effectiveStart}
          disabled={rowReadOnly}
          onChange={(e) => commitRowPatch(row.id, { startSlotIndex: parseInt(e.target.value, 10) })}
        >
          {BSIT_EVALUATOR_TIME_SLOTS.slice(0, maxStart + 1).map((t, idx) => (
            <option key={`${idx}-${t.label}`} value={idx}>
              {t.label.split(" - ")[0]}
            </option>
          ))}
        </select>
      </div>
      {pr ? <span className="text-[8px] text-black/50 tabular-nums">{timeFmt.fullLine}</span> : null}

      <input
        type="number"
        min={0}
        className={`${selectClass} tabular-nums`}
        disabled={rowReadOnly}
        value={row.students === "" ? "" : row.students}
        aria-label="Students"
        onChange={(e) => {
          const v = e.target.value;
          updateRow(row.id, { students: v === "" ? "" : Math.max(0, parseInt(v, 10) || 0) });
        }}
        placeholder="Students"
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 w-full text-[9px]"
        disabled={rowReadOnly}
        onClick={() => removeRow(row.id)}
      >
        Remove
      </Button>
    </li>
  );
}

/**
 * Chairman Evaluator: INS-style weekly grid with direct in-cell plotting (replaces row table + read-only preview).
 */
export function BsitChairmanInteractiveWeekGrid({
  rows,
  programCodeForSummary,
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
  termProspectusSemester,
  plottedCodesBySectionId,
  conflictForRow,
  campusScanConflictIds,
  overloadedInstructorIds,
  commitRowPatch,
  updateRow,
  removeRow,
  onPlotAtSlot,
  insFormBasePath = "/chairman/ins",
}: BsitChairmanInteractiveWeekGridProps) {
  const slots = BSIT_EVALUATOR_TIME_SLOTS;
  const buildingLabelsForGrid = useMemo(
    () => sortedNavigationBuildingKeysFromRooms(roomsForEvaluatorGrid),
    [roomsForEvaluatorGrid],
  );

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

  const handleEmptyCellClick = useCallback(
    (day: BsitEvaluatorWeekday, slotIdx: number) => {
      if (schedulePublished) return;
      onPlotAtSlot(day, slotIdx);
    },
    [schedulePublished, onPlotAtSlot],
  );

  return (
    <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden border border-black/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[15px] font-semibold text-black">Schedule preview (INS weekly grid)</div>
          <p className="text-[12px] text-black/55 mt-1">
            Monday–Friday · 7:00 AM–5:00 PM · Click an empty cell to plot · Merged cells follow subject duration
          </p>
        </div>
        <Button
          type="button"
          className="bg-[#780301] hover:bg-[#5a0201] text-white font-bold h-9 text-xs shrink-0"
          disabled={!insSectionId}
          onClick={() => window.open(insPrintHref, "_blank", "noopener,noreferrer")}
        >
          Generate INS Form
        </Button>
      </div>

      {!insSectionId ? (
        <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          Plot at least one row with a section to generate the printable INS Form 5B.
        </p>
      ) : null}

      {unplacedRows.length > 0 ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
          <p className="text-[11px] font-semibold text-amber-950">Unplaced rows — pick section, subject, day, and time</p>
          <ul className="space-y-2">
            {unplacedRows.map((row) => (
              <PlotBlockEditor
                key={row.id}
                row={row}
                programCodeForSummary={programCodeForSummary}
                programSections={programSections}
                instructorPlotOptions={instructorPlotOptions}
                roomsForEvaluatorGrid={roomsForEvaluatorGrid}
                buildingLabelsForGrid={buildingLabelsForGrid}
                roomById={roomById}
                roomBuildingByRowId={roomBuildingByRowId}
                setRoomBuildingByRowId={setRoomBuildingByRowId}
                instructorDisplayById={instructorDisplayById}
                sectionNameById={sectionNameById}
                termProspectusSemester={termProspectusSemester}
                plottedCodesBySectionId={plottedCodesBySectionId}
                rowReadOnly={schedulePublished || Boolean(row.lockedByDoiAt)}
                conflictFlags={conflictForRow(row)}
                commitRowPatch={commitRowPatch}
                updateRow={updateRow}
                removeRow={removeRow}
              />
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
                <th key={day} className="border border-black bg-[#ff990a] text-white px-1 py-1 min-w-[108px] font-bold">
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
                    if (!bounds || !r.sectionId || !r.subjectCode) return false;
                    return r.day === day && bounds.startIdx === slotIdx;
                  });
                  if (atHere.length === 0) {
                    return (
                      <td key={day} className="border border-black px-0.5 py-0.5 align-top min-h-[48px]">
                        <button
                          type="button"
                          disabled={schedulePublished}
                          className="w-full min-h-[44px] rounded border border-dashed border-black/20 text-black/30 hover:border-[#ff990a] hover:text-[#ff990a] hover:bg-[#ff990a]/5 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-0.5"
                          aria-label={`Plot schedule on ${day} at ${slot.label}`}
                          onClick={() => handleEmptyCellClick(day, slotIdx)}
                        >
                          <Plus className="w-3 h-3" aria-hidden />
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
                  const anyFaculty = cfMerged.some((c) => c.faculty === "Yes");
                  const anyRoom = cfMerged.some((c) => c.room === "Yes");
                  const anySection = cfMerged.some((c) => c.section === "Yes");
                  const mergedCf: RowConflictFlags = {
                    faculty: anyFaculty ? "Yes" : "No",
                    room: anyRoom ? "Yes" : "No",
                    section: anySection ? "Yes" : "No",
                  };

                  return (
                    <td
                      key={day}
                      rowSpan={rowspan}
                      className={`px-0.5 py-0.5 min-w-[108px] ${cellConflictClasses(mergedCf, scanHit, policyHit)}`}
                    >
                      <ul className="space-y-1.5">
                        {atHere.map((r) => (
                          <PlotBlockEditor
                            key={r.id}
                            row={r}
                            programCodeForSummary={programCodeForSummary}
                            programSections={programSections}
                            instructorPlotOptions={instructorPlotOptions}
                            roomsForEvaluatorGrid={roomsForEvaluatorGrid}
                            buildingLabelsForGrid={buildingLabelsForGrid}
                            roomById={roomById}
                            roomBuildingByRowId={roomBuildingByRowId}
                            setRoomBuildingByRowId={setRoomBuildingByRowId}
                            instructorDisplayById={instructorDisplayById}
                            sectionNameById={sectionNameById}
                            termProspectusSemester={termProspectusSemester}
                            plottedCodesBySectionId={plottedCodesBySectionId}
                            rowReadOnly={schedulePublished || Boolean(r.lockedByDoiAt)}
                            conflictFlags={conflictForRow(r)}
                            commitRowPatch={commitRowPatch}
                            updateRow={updateRow}
                            removeRow={removeRow}
                          />
                        ))}
                      </ul>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
