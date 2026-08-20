"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BSIT_EVALUATOR_TIME_SLOTS,
  BSIT_EVALUATOR_WEEKDAYS,
  type BsitEvaluatorWeekday,
} from "@/lib/chairman/bsit-evaluator-constants";
import { type BsitSemester } from "@/lib/chairman/bsit-prospectus";
import {
  maxPlotDurationSlots,
  plotRowDurationSlots,
} from "@/lib/evaluator/plot-duration";
import { prospectusRowForProgram } from "@/lib/chairman/prospectus-registry";
import { normalizeProspectusCode } from "@/lib/chairman/bsit-prospectus";
import {
  formatLecLabDisplay,
  getLecLabPair,
  inferLecLabMode,
  lecLabModesAvailable,
  prospectusSubjectsForSectionPlot,
  resolveSubjectCodeForLecLabMode,
  subjectRowsForPlotDropdown,
  type PlotLecLabMode,
} from "@/lib/evaluator/chairman-plot-leclab";
import { yearLevelFromSchedulingSectionName } from "@/lib/chairman/section-year-level";
import { campusNavigationBuildingOptionLabel } from "@/lib/campus/campus-navigation-catalog";
import {
  formatInstructorPlotOptionLabel,
  type InstructorPlotOption,
} from "@/lib/evaluator/instructor-employee-id";
import {
  formatRoomOptionLabel,
  roomBuildingKey,
  roomsInBuildingSorted,
} from "@/lib/evaluator/room-by-building";
import {
  detectConflictsSparse,
  type SparseScheduleBlock,
} from "@/lib/scheduling/conflicts";
import type { PlotRow } from "@/lib/evaluator/chairman-plot-row";
import type { Room, Section } from "@/types/db";
import type { RowConflictFlags } from "@/lib/evaluator/chairman-plot-row";

const fieldClass =
  "w-full min-h-10 rounded-lg border border-black/20 bg-white px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";
const labelClass = "text-[12px] font-semibold text-black/75";

function formatTimeRangeFromSlots(effectiveStart: number, dur: number): string {
  const slots = BSIT_EVALUATOR_TIME_SLOTS;
  const first = slots[effectiveStart];
  const last = slots[effectiveStart + dur - 1];
  if (!first || !last) return "—";
  const start = first.label.split(" - ")[0] ?? "";
  const end = last.label.split(" - ").pop() ?? "";
  return `${start} – ${end}`;
}

function buildCandidateBlock(
  draft: PlotRow,
  overrides: Partial<PlotRow>,
  academicPeriodId: string,
  programCodeForSummary: string,
): SparseScheduleBlock | null {
  const merged = { ...draft, ...overrides };
  if (!merged.subjectCode || !merged.day) return null;
  const pr = prospectusRowForProgram(programCodeForSummary, merged.subjectCode);
  if (!pr) return null;
  const dur = plotRowDurationSlots(pr, merged);
  const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - dur;
  const startIdx =
    merged.startSlotIndex < 0 ? 0 : Math.min(merged.startSlotIndex, maxS);
  const start = BSIT_EVALUATOR_TIME_SLOTS[startIdx];
  const endSlot = BSIT_EVALUATOR_TIME_SLOTS[startIdx + dur - 1];
  if (!start || !endSlot) return null;
  return {
    id: merged.id,
    academicPeriodId,
    day: merged.day,
    startTime: start.startTime,
    endTime: endSlot.endTime,
    instructorId: merged.instructorId || null,
    sectionId: merged.sectionId || null,
    roomId: merged.roomId || null,
  };
}

export type MajorOption = { value: string; label: string };

export type ChairmanPlotScheduleModalProps = {
  open: boolean;
  onClose: () => void;
  draft: PlotRow;
  onDraftChange: (next: PlotRow) => void;
  buildingValue: string;
  onBuildingChange: (building: string) => void;
  programCodeForSummary: string;
  majorOptions: MajorOption[];
  programSections: Section[];
  instructorPlotOptions: InstructorPlotOption[];
  roomsForEvaluatorGrid: Room[];
  buildingLabelsForGrid: string[];
  sectionNameById: Map<string, string>;
  termProspectusSemester: BsitSemester | null;
  plottedCodesBySectionId: Map<string, Set<string>>;
  conflictFlags: RowConflictFlags;
  /** Detailed overlap lines (instructor, room, section, time). */
  conflictDetailLines?: string[];
  /** Academic period ID for conflict checking. */
  academicPeriodId: string;
  /** All existing schedule blocks (excluding current draft) to check availability against. */
  existingBlocks: SparseScheduleBlock[];
  /** Instructor weekly teaching-hours snapshot (current campus-wide hours + cap) for the live overload indicator. */
  instructorLoadById?: Map<string, { hours: number; cap: number }>;
  readOnly: boolean;
  isNewPlot: boolean;
  anchorLabel: string;
  onApply: () => void;
  onRemove?: () => void;
};

export function ChairmanPlotScheduleModal({
  open,
  onClose,
  draft,
  onDraftChange,
  buildingValue,
  onBuildingChange,
  programCodeForSummary,
  majorOptions,
  programSections,
  instructorPlotOptions,
  roomsForEvaluatorGrid,
  buildingLabelsForGrid,
  sectionNameById,
  termProspectusSemester,
  plottedCodesBySectionId,
  conflictFlags,
  conflictDetailLines = [],
  academicPeriodId,
  existingBlocks,
  instructorLoadById,
  readOnly,
  isNewPlot,
  anchorLabel,
  onApply,
  onRemove,
}: ChairmanPlotScheduleModalProps) {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setAnimateIn(false);
      const t = window.setTimeout(() => setVisible(false), 200);
      return () => window.clearTimeout(t);
    }
    setVisible(true);
    const t = window.requestAnimationFrame(() => setAnimateIn(true));
    return () => window.cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const pr = draft.subjectCode
    ? prospectusRowForProgram(programCodeForSummary, draft.subjectCode)
    : undefined;
  const dur = pr ? plotRowDurationSlots(pr, draft) : 1;
  const maxDur = pr ? maxPlotDurationSlots(pr) : 1;
  const maxStart = BSIT_EVALUATOR_TIME_SLOTS.length - dur;
  const effectiveStart =
    draft.startSlotIndex < 0 ? 0 : Math.min(draft.startSlotIndex, maxStart);
  const timeLine =
    !draft.day || draft.startSlotIndex < 0
      ? "Select subject, day, and time"
      : pr
        ? formatTimeRangeFromSlots(effectiveStart, dur)
        : "Select subject for duration";
  const sectionName = draft.sectionId
    ? (sectionNameById.get(draft.sectionId) ?? "")
    : "";
  const yearLevel = sectionName
    ? yearLevelFromSchedulingSectionName(sectionName)
    : null;

  const rawSubjectOptions = useMemo(
    () =>
      subjectRowsForPlotDropdown(
        programCodeForSummary,
        prospectusSubjectsForSectionPlot({
          programCode: programCodeForSummary,
          yearLevel,
          termSemester: termProspectusSemester,
        }),
      ),
    [programCodeForSummary, yearLevel, termProspectusSemester],
  );

  const subjectSelectValue = useMemo(() => {
    if (!draft.subjectCode) return "";
    const pair = getLecLabPair(programCodeForSummary, draft.subjectCode);
    return pair.lecCode ?? draft.subjectCode;
  }, [draft.subjectCode, programCodeForSummary]);

  const { availableSubjects, addAnotherSlotSubjects } = useMemo(() => {
    const plotted = draft.sectionId
      ? plottedCodesBySectionId.get(draft.sectionId)
      : undefined;
    const isCurrent = (code: string) =>
      normalizeProspectusCode(code) ===
        normalizeProspectusCode(draft.subjectCode) ||
      normalizeProspectusCode(code) ===
        normalizeProspectusCode(subjectSelectValue);
    const available = rawSubjectOptions.filter(
      (s) =>
        !plotted ||
        !plotted.has(normalizeProspectusCode(s.code)) ||
        isCurrent(s.code),
    );
    const addAnother = rawSubjectOptions.filter(
      (s) =>
        plotted &&
        plotted.has(normalizeProspectusCode(s.code)) &&
        !isCurrent(s.code),
    );
    return { availableSubjects: available, addAnotherSlotSubjects: addAnother };
  }, [
    rawSubjectOptions,
    draft.sectionId,
    draft.subjectCode,
    plottedCodesBySectionId,
    subjectSelectValue,
  ]);

  const lecLabModes = draft.subjectCode
    ? lecLabModesAvailable(programCodeForSummary, draft.subjectCode)
    : [];
  const lecLabSelectable = lecLabModes.length > 1;

  const roomsInB = buildingValue
    ? roomsInBuildingSorted(roomsForEvaluatorGrid, buildingValue)
    : [];

  const noSections = programSections.length === 0;
  const noInstructors = instructorPlotOptions.length === 0;
  const noBuildings = buildingLabelsForGrid.length === 0;
  const noSubjectsForSection =
    Boolean(draft.sectionId) && rawSubjectOptions.length === 0;

  const hasConflict =
    conflictFlags.faculty === "Yes" ||
    conflictFlags.room === "Yes" ||
    conflictFlags.section === "Yes";

  const draftDurationHours = pr ? dur : 0;

  const selectedInstructorLoad = draft.instructorId
    ? (instructorLoadById?.get(draft.instructorId) ?? null)
    : null;
  const projectedInstructorHours = selectedInstructorLoad
    ? selectedInstructorLoad.hours + draftDurationHours
    : null;
  const instructorWillBeOverloaded =
    selectedInstructorLoad != null &&
    projectedInstructorHours != null &&
    projectedInstructorHours > selectedInstructorLoad.cap + 1e-6;
  const instructorNearingOverload =
    !instructorWillBeOverloaded &&
    selectedInstructorLoad != null &&
    projectedInstructorHours != null &&
    projectedInstructorHours >= selectedInstructorLoad.cap - 2 + 1e-6;

  const busyInstructorIds = useMemo(() => {
    if (!draft.day || !draft.subjectCode || existingBlocks.length === 0)
      return null;
    const busy = new Set<string>();
    for (const opt of instructorPlotOptions) {
      if (!opt.id) continue;
      const candidate = buildCandidateBlock(
        draft,
        { instructorId: opt.id },
        academicPeriodId,
        programCodeForSummary,
      );
      if (!candidate) continue;
      const hits = detectConflictsSparse(candidate, existingBlocks, draft.id);
      if (hits.some((h) => h.type === "faculty")) {
        busy.add(opt.id);
      }
    }
    return busy;
  }, [
    draft,
    existingBlocks,
    academicPeriodId,
    programCodeForSummary,
    instructorPlotOptions,
  ]);

  const busyDays = useMemo(() => {
    if (
      !draft.instructorId ||
      !draft.subjectCode ||
      existingBlocks.length === 0
    )
      return null;
    const busy = new Set<BsitEvaluatorWeekday>();
    for (const day of BSIT_EVALUATOR_WEEKDAYS) {
      const candidate = buildCandidateBlock(
        draft,
        { day },
        academicPeriodId,
        programCodeForSummary,
      );
      if (!candidate) continue;
      const hits = detectConflictsSparse(candidate, existingBlocks, draft.id);
      if (hits.some((h) => h.type === "faculty" || h.type === "section")) {
        busy.add(day);
      }
    }
    return busy;
  }, [draft, existingBlocks, academicPeriodId, programCodeForSummary]);

  const busyTimeSlotIndices = useMemo(() => {
    if (
      !draft.day ||
      !draft.instructorId ||
      !draft.subjectCode ||
      existingBlocks.length === 0
    )
      return null;
    const busy = new Set<number>();
    for (let idx = 0; idx <= maxStart; idx++) {
      const candidate = buildCandidateBlock(
        draft,
        { startSlotIndex: idx },
        academicPeriodId,
        programCodeForSummary,
      );
      if (!candidate) continue;
      const hits = detectConflictsSparse(candidate, existingBlocks, draft.id);
      if (
        hits.some(
          (h) =>
            h.type === "faculty" || h.type === "room" || h.type === "section",
        )
      ) {
        busy.add(idx);
      }
    }
    return busy;
  }, [
    draft,
    existingBlocks,
    academicPeriodId,
    programCodeForSummary,
    maxStart,
  ]);

  const busyRoomIds = useMemo(() => {
    if (
      !draft.day ||
      !draft.subjectCode ||
      !buildingValue ||
      existingBlocks.length === 0
    )
      return null;
    const busy = new Set<string>();
    for (const room of roomsInB) {
      const candidate = buildCandidateBlock(
        draft,
        { roomId: room.id },
        academicPeriodId,
        programCodeForSummary,
      );
      if (!candidate) continue;
      const hits = detectConflictsSparse(candidate, existingBlocks, draft.id);
      if (hits.some((h) => h.type === "room")) {
        busy.add(room.id);
      }
    }
    return busy;
  }, [
    draft,
    existingBlocks,
    academicPeriodId,
    programCodeForSummary,
    roomsInB,
    buildingValue,
  ]);

  if (!visible && !open) return null;

  return (
    <div
      className={`fixed inset-0 z-[130] flex items-center justify-center p-4 transition-opacity duration-200 ease-out ${
        animateIn && open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plot-schedule-modal-title"
        className={`w-full max-w-lg max-h-[min(90vh,720px)] overflow-y-auto rounded-xl bg-white shadow-2xl border border-black/10 transition-all duration-200 ease-out ${
          animateIn && open
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-[0.97] translate-y-2"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-black/10 bg-gradient-to-r from-[#ff990a]/10 to-white px-5 py-4">
          <div>
            <h2
              id="plot-schedule-modal-title"
              className="text-lg font-bold text-[#780301]"
            >
              {isNewPlot ? "Plot schedule" : "Edit schedule"}
            </h2>
            <p className="text-[12px] text-black/55 mt-0.5">{anchorLabel}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-black/50 hover:bg-black/5 hover:text-black transition-colors"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {hasConflict ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 flex gap-2 text-[12px] text-red-950"
              role="alert"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
              <div className="space-y-1">
                <p className="font-semibold">Scheduling conflict detected</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {conflictDetailLines.length > 0 ? (
                    conflictDetailLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))
                  ) : (
                    <>
                      {conflictFlags.faculty === "Yes" ? (
                        <li>Faculty — instructor double-booked at this time</li>
                      ) : null}
                      {conflictFlags.room === "Yes" ? (
                        <li>Room — already occupied at this time</li>
                      ) : null}
                      {conflictFlags.section === "Yes" ? (
                        <li>Section — another class overlaps this time</li>
                      ) : null}
                    </>
                  )}
                </ul>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="plot-major">
                Major
              </label>
              <select
                id="plot-major"
                className={`${fieldClass} mt-1`}
                value={programCodeForSummary}
                disabled={readOnly || majorOptions.length <= 1}
                onChange={() => {
                  /* Chairman scope is one program; dropdown documents the active major. */
                }}
              >
                {majorOptions.length === 0 ? (
                  <option value="">No program in scope</option>
                ) : (
                  majorOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="plot-leclab">
                Lec / Lab
              </label>
              <select
                id="plot-leclab"
                className={`${fieldClass} mt-1`}
                value={draft.lecLabMode}
                disabled={readOnly || !draft.subjectCode || !lecLabSelectable}
                onChange={(e) => {
                  const mode = e.target.value as PlotLecLabMode;
                  const base = subjectSelectValue || draft.subjectCode;
                  const subjectCode = resolveSubjectCodeForLecLabMode(
                    programCodeForSummary,
                    base,
                    mode,
                  );
                  const p = prospectusRowForProgram(
                    programCodeForSummary,
                    subjectCode,
                  );
                  let startSlotIndex = draft.startSlotIndex;
                  if (p) {
                    const d = plotRowDurationSlots(p, draft);
                    const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - d;
                    if (startSlotIndex > maxS) startSlotIndex = maxS;
                  }
                  onDraftChange({
                    ...draft,
                    lecLabMode: mode,
                    subjectCode,
                    startSlotIndex,
                    durationSlots: 1,
                  });
                }}
              >
                {!draft.subjectCode ? (
                  <option value="lec">Select subject first…</option>
                ) : lecLabSelectable ? (
                  lecLabModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {formatLecLabDisplay(mode)}
                    </option>
                  ))
                ) : (
                  <option value={draft.lecLabMode}>
                    {formatLecLabDisplay(draft.lecLabMode)}
                  </option>
                )}
              </select>
              {pr ? (
                <p className="text-[10px] text-black/45 mt-0.5 tabular-nums">
                  {pr.lecUnits}u/{pr.lecHours}h lec · {pr.labUnits}u/
                  {pr.labHours}h lab
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="plot-section">
              Section
            </label>
            <select
              id="plot-section"
              className={`${fieldClass} mt-1`}
              value={draft.sectionId}
              disabled={readOnly || noSections}
              onChange={(e) => {
                const sectionId = e.target.value;
                const name =
                  programSections.find((s) => s.id === sectionId)?.name ?? "";
                const yl = yearLevelFromSchedulingSectionName(name);
                let subjectCode = draft.subjectCode;
                if (subjectCode && yl != null) {
                  const s = prospectusRowForProgram(
                    programCodeForSummary,
                    subjectCode,
                  );
                  const sem = termProspectusSemester;
                  if (!s || s.yearLevel !== yl) subjectCode = "";
                  else if (sem != null && s.semester !== sem) subjectCode = "";
                }
                onDraftChange({ ...draft, sectionId, subjectCode });
              }}
            >
              <option value="">
                {noSections
                  ? "No sections for this program"
                  : "Select section…"}
              </option>
              {programSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="plot-subject">
              Subject code
            </label>
            <select
              id="plot-subject"
              className={`${fieldClass} mt-1`}
              value={subjectSelectValue}
              disabled={readOnly || !draft.sectionId}
              onChange={(e) => {
                const picked = e.target.value;
                if (!picked) {
                  onDraftChange({
                    ...draft,
                    subjectCode: "",
                    lecLabMode: "lec",
                  });
                  return;
                }
                const mode = inferLecLabMode(programCodeForSummary, picked);
                const subjectCode = resolveSubjectCodeForLecLabMode(
                  programCodeForSummary,
                  picked,
                  mode,
                );
                const p = prospectusRowForProgram(
                  programCodeForSummary,
                  subjectCode,
                );
                let startSlotIndex = draft.startSlotIndex;
                if (p) {
                  const d = plotRowDurationSlots(p, { durationSlots: 1 });
                  const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - d;
                  if (startSlotIndex > maxS) startSlotIndex = maxS;
                }
                onDraftChange({
                  ...draft,
                  subjectCode,
                  lecLabMode: mode,
                  startSlotIndex,
                  durationSlots: 1,
                });
              }}
            >
              <option value="">
                {!draft.sectionId
                  ? "Select section first…"
                  : noSubjectsForSection
                    ? "No subjects for this section / term"
                    : "Select subject…"}
              </option>
              {availableSubjects.length > 0 ? (
                <optgroup label="Available">
                  {availableSubjects.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} — {s.title}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {addAnotherSlotSubjects.length > 0 ? (
                <optgroup label="Add another time slot (same subject)">
                  {addAnotherSlotSubjects.map((s) => (
                    <option key={`split-${s.code}`} value={s.code}>
                      + {s.code} — {s.title}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {draft.subjectCode &&
              !availableSubjects.some(
                (s) =>
                  normalizeProspectusCode(s.code) ===
                  normalizeProspectusCode(subjectSelectValue),
              ) ? (
                <option value={subjectSelectValue}>
                  {draft.subjectCode} — {pr?.title ?? "Current selection"}
                </option>
              ) : null}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="plot-instructor">
              Instructor
            </label>
            <select
              id="plot-instructor"
              className={`${fieldClass} mt-1`}
              value={draft.instructorId}
              disabled={readOnly || noInstructors}
              onChange={(e) =>
                onDraftChange({ ...draft, instructorId: e.target.value })
              }
            >
              <option value="">
                {noInstructors
                  ? "No instructors (set Employee ID in Faculty Profile)"
                  : "Select instructor…"}
              </option>
              {instructorPlotOptions.map((opt) => {
                const conflict = busyInstructorIds?.has(opt.id) === true;
                return (
                  <option
                    key={opt.id}
                    value={opt.id}
                    disabled={conflict && draft.instructorId !== opt.id}
                  >
                    {formatInstructorPlotOptionLabel(opt)}
                    {conflict ? " — Busy at this time" : ""}
                  </option>
                );
              })}
            </select>
            {selectedInstructorLoad ? (
              <p
                className={`mt-1 text-[11px] font-medium rounded-md px-2 py-1 border ${
                  instructorWillBeOverloaded
                    ? "text-red-900 bg-red-50 border-red-200"
                    : instructorNearingOverload
                      ? "text-amber-900 bg-amber-50 border-amber-200"
                      : "text-black/55 border-transparent"
                }`}
              >
                {projectedInstructorHours?.toFixed(1)} / {selectedInstructorLoad.cap} hrs/week
                {instructorWillBeOverloaded
                  ? " — this will exceed the maximum load; a justification will be required."
                  : instructorNearingOverload
                    ? " — approaching the maximum load."
                    : ""}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="plot-building">
              Building
            </label>
              <select
                id="plot-building"
                className={`${fieldClass} mt-1`}
                value={buildingValue}
                disabled={readOnly || noBuildings}
                onChange={(e) => {
                  const b = e.target.value;
                  onBuildingChange(b);
                  const keep =
                    draft.roomId &&
                    roomsForEvaluatorGrid.some(
                      (r) => r.id === draft.roomId && roomBuildingKey(r) === b,
                    );
                  if (!keep) onDraftChange({ ...draft, roomId: "" });
                }}
              >
                <option value="">
                  {noBuildings ? "No rooms in catalog" : "Select building…"}
                </option>
                {buildingLabelsForGrid.map((b) => (
                  <option key={b} value={b}>
                    {campusNavigationBuildingOptionLabel(b)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="plot-room">
                Room
              </label>
              <select
                id="plot-room"
                className={`${fieldClass} mt-1`}
                value={draft.roomId}
                disabled={readOnly || !buildingValue}
                onChange={(e) =>
                  onDraftChange({ ...draft, roomId: e.target.value })
                }
              >
                <option value="">
                  {buildingValue ? "Select room…" : "Select building first"}
                </option>
                {roomsInB.map((r) => {
                  const conflict = busyRoomIds?.has(r.id) === true;
                  return (
                    <option
                      key={r.id}
                      value={r.id}
                      disabled={conflict && draft.roomId !== r.id}
                    >
                      {formatRoomOptionLabel(r)}
                      {conflict ? " — Occupied" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="plot-day">
                Day
              </label>
              <select
                id="plot-day"
                className={`${fieldClass} mt-1`}
                value={draft.day}
                disabled={readOnly}
                onChange={(e) =>
                  onDraftChange({
                    ...draft,
                    day: e.target.value as BsitEvaluatorWeekday,
                  })
                }
              >
                <option value="">Select day…</option>
                {BSIT_EVALUATOR_WEEKDAYS.map((d) => {
                  const conflict = busyDays?.has(d) === true;
                  return (
                    <option
                      key={d}
                      value={d}
                      disabled={conflict && draft.day !== d}
                    >
                      {d}
                      {conflict ? " — Busy on this day" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="plot-start">
                Time slot (start)
              </label>
              <select
                id="plot-start"
                className={`${fieldClass} mt-1`}
                value={draft.startSlotIndex < 0 ? "" : effectiveStart}
                disabled={readOnly}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  onDraftChange({ ...draft, startSlotIndex: parseInt(v, 10) });
                }}
              >
                <option value="">Select time…</option>
                {BSIT_EVALUATOR_TIME_SLOTS.slice(0, maxStart + 1).map(
                  (t, idx) => {
                    const conflict = busyTimeSlotIndices?.has(idx) === true;
                    return (
                      <option
                        key={`${idx}-${t.label}`}
                        value={idx}
                        disabled={conflict && effectiveStart !== idx}
                      >
                        {t.label}
                        {conflict ? " — Conflict" : ""}
                      </option>
                    );
                  },
                )}
              </select>
            </div>
          </div>

          {pr && maxDur > 1 ? (
            <div>
              <label className={labelClass} htmlFor="plot-duration">
                Duration (consecutive hours this meeting)
              </label>
              <select
                id="plot-duration"
                className={`${fieldClass} mt-1`}
                value={dur}
                disabled={readOnly}
                onChange={(e) => {
                  const durationSlots = parseInt(e.target.value, 10) || 1;
                  const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - durationSlots;
                  const startSlotIndex = Math.min(draft.startSlotIndex, maxS);
                  onDraftChange({ ...draft, durationSlots, startSlotIndex });
                }}
              >
                {Array.from({ length: maxDur }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>
                    {h} hour{h === 1 ? "" : "s"} (max {maxDur} for this subject)
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-black/50 mt-1">
                To split contact across different days or times, set 1 hour here
                and plot the same subject again.
              </p>
            </div>
          ) : null}

          <p className="text-[12px] font-medium text-black/60 rounded-lg bg-[#ff990a]/8 border border-[#ff990a]/25 px-3 py-2">
            Preview: <span className="text-black/85">{timeLine}</span>
            {pr ? (
              <span className="text-black/50">
                {" "}
                · {dur} consecutive hour{dur === 1 ? "" : "s"}
              </span>
            ) : null}
          </p>

          <div>
            <label className={labelClass} htmlFor="plot-students">
              Students (enrollment)
            </label>
            <input
              id="plot-students"
              type="number"
              min={0}
              className={`${fieldClass} mt-1 tabular-nums`}
              disabled={readOnly}
              value={draft.students === "" ? "" : draft.students}
              onChange={(e) => {
                const v = e.target.value;
                onDraftChange({
                  ...draft,
                  students: v === "" ? "" : Math.max(0, parseInt(v, 10) || 0),
                });
              }}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-black/10 bg-white/95 backdrop-blur px-5 py-4">
          {!isNewPlot && onRemove && !readOnly ? (
            <Button
              type="button"
              variant="outline"
              className="mr-auto text-red-800 border-red-200"
              onClick={onRemove}
            >
              Remove schedule
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold min-w-[120px]"
            disabled={readOnly || hasConflict}
            onClick={onApply}
          >
            {isNewPlot ? "Plot schedule" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
