"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BSIT_EVALUATOR_TIME_SLOTS,
  BSIT_EVALUATOR_WEEKDAYS,
  type BsitEvaluatorWeekday,
} from "@/lib/chairman/bsit-evaluator-constants";
import { scheduleDurationSlots, type BsitSemester } from "@/lib/chairman/bsit-prospectus";
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

  const pr = draft.subjectCode ? prospectusRowForProgram(programCodeForSummary, draft.subjectCode) : undefined;
  const dur = pr ? scheduleDurationSlots(pr) : 1;
  const maxStart = BSIT_EVALUATOR_TIME_SLOTS.length - dur;
  const effectiveStart = Math.min(draft.startSlotIndex, maxStart);
  const timeLine = pr ? formatTimeRangeFromSlots(effectiveStart, dur) : "Select subject for duration";
  const sectionName = draft.sectionId ? (sectionNameById.get(draft.sectionId) ?? "") : "";
  const yearLevel = sectionName ? yearLevelFromSchedulingSectionName(sectionName) : null;

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

  const { availableSubjects, alreadyScheduledSubjects } = useMemo(() => {
    const plotted = draft.sectionId ? plottedCodesBySectionId.get(draft.sectionId) : undefined;
    const available = rawSubjectOptions.filter(
      (s) => !plotted || !plotted.has(normalizeProspectusCode(s.code)) || s.code === draft.subjectCode,
    );
    const already = rawSubjectOptions.filter(
      (s) => plotted && plotted.has(normalizeProspectusCode(s.code)) && s.code !== draft.subjectCode,
    );
    return { availableSubjects: available, alreadyScheduledSubjects: already };
  }, [rawSubjectOptions, draft.sectionId, draft.subjectCode, plottedCodesBySectionId]);

  const lecLabModes = draft.subjectCode ? lecLabModesAvailable(programCodeForSummary, draft.subjectCode) : [];
  const lecLabSelectable = lecLabModes.length > 1;

  const subjectSelectValue = useMemo(() => {
    if (!draft.subjectCode) return "";
    const pair = getLecLabPair(programCodeForSummary, draft.subjectCode);
    return pair.lecCode ?? draft.subjectCode;
  }, [draft.subjectCode, programCodeForSummary]);

  const roomsInB = buildingValue ? roomsInBuildingSorted(roomsForEvaluatorGrid, buildingValue) : [];

  const noSections = programSections.length === 0;
  const noInstructors = instructorPlotOptions.length === 0;
  const noBuildings = buildingLabelsForGrid.length === 0;
  const noSubjectsForSection = Boolean(draft.sectionId) && rawSubjectOptions.length === 0;

  const hasConflict =
    conflictFlags.faculty === "Yes" || conflictFlags.room === "Yes" || conflictFlags.section === "Yes";

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
          animateIn && open ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-[0.97] translate-y-2"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-black/10 bg-gradient-to-r from-[#ff990a]/10 to-white px-5 py-4">
          <div>
            <h2 id="plot-schedule-modal-title" className="text-lg font-bold text-[#780301]">
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
                  {conflictFlags.faculty === "Yes" ? <li>Faculty conflict</li> : null}
                  {conflictFlags.room === "Yes" ? <li>Room conflict</li> : null}
                  {conflictFlags.section === "Yes" ? <li>Section conflict</li> : null}
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
                  const subjectCode = resolveSubjectCodeForLecLabMode(programCodeForSummary, base, mode);
                  const p = prospectusRowForProgram(programCodeForSummary, subjectCode);
                  let startSlotIndex = draft.startSlotIndex;
                  if (p) {
                    const d = scheduleDurationSlots(p);
                    const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - d;
                    if (startSlotIndex > maxS) startSlotIndex = maxS;
                  }
                  onDraftChange({ ...draft, lecLabMode: mode, subjectCode, startSlotIndex });
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
                  <option value={draft.lecLabMode}>{formatLecLabDisplay(draft.lecLabMode)}</option>
                )}
              </select>
              {pr ? (
                <p className="text-[10px] text-black/45 mt-0.5 tabular-nums">
                  {pr.lecUnits}u/{pr.lecHours}h lec · {pr.labUnits}u/{pr.labHours}h lab
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
                const name = programSections.find((s) => s.id === sectionId)?.name ?? "";
                const yl = yearLevelFromSchedulingSectionName(name);
                let subjectCode = draft.subjectCode;
                if (subjectCode && yl != null) {
                  const s = prospectusRowForProgram(programCodeForSummary, subjectCode);
                  const sem = termProspectusSemester;
                  if (!s || s.yearLevel !== yl) subjectCode = "";
                  else if (sem != null && s.semester !== sem) subjectCode = "";
                }
                onDraftChange({ ...draft, sectionId, subjectCode });
              }}
            >
              <option value="">{noSections ? "No sections for this program" : "Select section…"}</option>
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
                  onDraftChange({ ...draft, subjectCode: "", lecLabMode: "lec" });
                  return;
                }
                const mode = inferLecLabMode(programCodeForSummary, picked);
                const subjectCode = resolveSubjectCodeForLecLabMode(programCodeForSummary, picked, mode);
                const p = prospectusRowForProgram(programCodeForSummary, subjectCode);
                let startSlotIndex = draft.startSlotIndex;
                if (p) {
                  const d = scheduleDurationSlots(p);
                  const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - d;
                  if (startSlotIndex > maxS) startSlotIndex = maxS;
                }
                onDraftChange({ ...draft, subjectCode, lecLabMode: mode, startSlotIndex });
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
              {alreadyScheduledSubjects.length > 0 ? (
                <optgroup label="Already scheduled">
                  {alreadyScheduledSubjects.map((s) => (
                    <option key={s.code} value={s.code} disabled>
                      ✓ {s.code} — {s.title}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {draft.subjectCode &&
              !availableSubjects.some((s) => normalizeProspectusCode(s.code) === normalizeProspectusCode(subjectSelectValue)) ? (
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
              onChange={(e) => onDraftChange({ ...draft, instructorId: e.target.value })}
            >
              <option value="">{noInstructors ? "No instructors (set Employee ID in Faculty Profile)" : "Select instructor…"}</option>
              {instructorPlotOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {formatInstructorPlotOptionLabel(opt)}
                </option>
              ))}
            </select>
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
                    draft.roomId && roomsForEvaluatorGrid.some((r) => r.id === draft.roomId && roomBuildingKey(r) === b);
                  if (!keep) onDraftChange({ ...draft, roomId: "" });
                }}
              >
                <option value="">{noBuildings ? "No rooms in catalog" : "Select building…"}</option>
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
                onChange={(e) => onDraftChange({ ...draft, roomId: e.target.value })}
              >
                <option value="">{buildingValue ? "Select room…" : "Select building first"}</option>
                {roomsInB.map((r) => (
                  <option key={r.id} value={r.id}>
                    {formatRoomOptionLabel(r)}
                  </option>
                ))}
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
                onChange={(e) => onDraftChange({ ...draft, day: e.target.value as BsitEvaluatorWeekday })}
              >
                {BSIT_EVALUATOR_WEEKDAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="plot-start">
                Time slot (start)
              </label>
              <select
                id="plot-start"
                className={`${fieldClass} mt-1`}
                value={effectiveStart}
                disabled={readOnly}
                onChange={(e) => onDraftChange({ ...draft, startSlotIndex: parseInt(e.target.value, 10) })}
              >
                {BSIT_EVALUATOR_TIME_SLOTS.slice(0, maxStart + 1).map((t, idx) => (
                  <option key={`${idx}-${t.label}`} value={idx}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-[12px] font-medium text-black/60 rounded-lg bg-[#ff990a]/8 border border-[#ff990a]/25 px-3 py-2">
            Duration: <span className="text-black/85">{timeLine}</span>
            {pr ? (
              <span className="text-black/50">
                {" "}
                · {dur} hour{dur === 1 ? "" : "s"} from prospectus
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
            <Button type="button" variant="outline" className="mr-auto text-red-800 border-red-200" onClick={onRemove}>
              Remove schedule
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold min-w-[120px]"
            disabled={readOnly}
            onClick={onApply}
          >
            {isNewPlot ? "Plot schedule" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
