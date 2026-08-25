"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  evaluatorTimeSlots,
  evaluatorWeekdays,
  type BsitEvaluatorWeekday,
} from "@/lib/chairman/bsit-evaluator-constants";
import { isEvaluatorSlotPlottable, type HourSlot, type ProgramMode } from "@/lib/scheduling/program-mode";
import { normalizeSlotHHMM } from "@/lib/chairman/evaluator-schedule-hydration";
import {
  inferDurationSlotsFromTimes,
  maxPlotDurationSlotsForSubject,
  plotEntryDurationSlots,
  timesFromSlotRange,
} from "@/lib/evaluator/plot-duration";
import { campusNavigationBuildingOptionLabel } from "@/lib/campus/campus-navigation-catalog";
import { GEC_VACANT_INSTRUCTOR_USER_ID } from "@/lib/gec/gec-vacant";
import {
  formatInstructorPlotOptionLabel,
  type InstructorPlotOption,
} from "@/lib/evaluator/instructor-employee-id";
import {
  formatRoomOptionLabel,
  roomBuildingKey,
  roomsInBuildingSorted,
} from "@/lib/evaluator/room-by-building";
import type { RowConflictFlags } from "@/lib/evaluator/chairman-plot-row";
import type { Room, ScheduleEntry, Subject } from "@/types/db";

const fieldClass =
  "w-full min-h-10 rounded-lg border border-black/20 bg-white px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";
const labelClass = "text-[12px] font-semibold text-black/75";

function hhmm(t: string): string {
  return normalizeSlotHHMM(t);
}

function startSlotIndexFromEntry(e: ScheduleEntry, slots: { startTime: string }[]): number {
  const h = hhmm(e.startTime);
  const idx = slots.findIndex((t) => t.startTime === h);
  return idx >= 0 ? idx : 0;
}

function formatTimeRangeFromSlots(
  effectiveStart: number,
  dur: number,
  slots: { label: string }[],
): string {
  const first = slots[effectiveStart];
  const last = slots[effectiveStart + dur - 1];
  if (!first || !last) return "—";
  const start = first.label.split(" - ")[0] ?? "";
  const end = last.label.split(" - ").pop() ?? "";
  return `${start} – ${end}`;
}

export type GecPlotScheduleModalProps = {
  open: boolean;
  onClose: () => void;
  draft: ScheduleEntry;
  onDraftChange: (next: ScheduleEntry) => void;
  buildingValue: string;
  onBuildingChange: (building: string) => void;
  programCode: string;
  programMode?: ProgramMode;
  weekdays?: readonly BsitEvaluatorWeekday[];
  timeSlots?: HourSlot[];
  sectionName: string;
  gecSubjects: Subject[];
  instructorPlotOptions: InstructorPlotOption[];
  rooms: Room[];
  buildingLabels: string[];
  conflictFlags: RowConflictFlags;
  conflictDetailLines?: string[];
  /** Consecutive 1-hour slots for this meeting (default 1 — split across rows). */
  durationSlots: number;
  onDurationSlotsChange: (slots: number) => void;
  /** GEC subject ids already plotted in this section (allows “add another slot”). */
  plottedGecSubjectIds: Set<string>;
  readOnly: boolean;
  isNewPlot: boolean;
  anchorLabel: string;
  pickedSummaryCode: string | null;
  pickedSubjectId: string | null;
  onApplyPickedSummary?: () => void;
  onApply: () => void;
  onRemove?: () => void;
};

export function GecPlotScheduleModal({
  open,
  onClose,
  draft,
  onDraftChange,
  buildingValue,
  onBuildingChange,
  programCode,
  programMode = "day",
  weekdays,
  timeSlots,
  sectionName,
  gecSubjects,
  instructorPlotOptions,
  rooms,
  buildingLabels,
  conflictFlags,
  conflictDetailLines = [],
  durationSlots,
  onDurationSlotsChange,
  plottedGecSubjectIds,
  readOnly,
  isNewPlot,
  anchorLabel,
  pickedSummaryCode,
  pickedSubjectId,
  onApplyPickedSummary,
  onApply,
  onRemove,
}: GecPlotScheduleModalProps) {
  const slots = timeSlots ?? evaluatorTimeSlots(programMode);
  const days = weekdays ?? evaluatorWeekdays(programMode);
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

  const sub = gecSubjects.find((s) => s.id === draft.subjectId);
  const dur = plotEntryDurationSlots(programCode, sub, durationSlots);
  const maxDur = sub ? maxPlotDurationSlotsForSubject(programCode, sub) : 1;
  const maxStart = slots.length - dur;
  const startIdx = startSlotIndexFromEntry(draft, slots);
  const effectiveStart = Math.min(Math.max(0, startIdx), maxStart);
  const timeLine = sub ? formatTimeRangeFromSlots(effectiveStart, dur, slots) : "Select GEC subject for duration";
  const roomsInB = buildingValue ? roomsInBuildingSorted(rooms, buildingValue) : [];

  const { availableSubjects, addAnotherSlotSubjects } = useMemo(() => {
    const isCurrent = (id: string) => id === draft.subjectId;
    const available = gecSubjects.filter((s) => !plottedGecSubjectIds.has(s.id) || isCurrent(s.id));
    const addAnother = gecSubjects.filter((s) => plottedGecSubjectIds.has(s.id) && !isCurrent(s.id));
    return { availableSubjects: available, addAnotherSlotSubjects: addAnother };
  }, [gecSubjects, plottedGecSubjectIds, draft.subjectId]);

  const hasConflict =
    conflictFlags.faculty === "Yes" || conflictFlags.room === "Yes" || conflictFlags.section === "Yes";

  const applySlotFromIndex = (idx: number, subjectId: string, slotDur = durationSlots) => {
    const subject = gecSubjects.find((s) => s.id === subjectId);
    const d = plotEntryDurationSlots(programCode, subject, slotDur);
    const maxS = slots.length - d;
    const eff = Math.min(Math.max(0, idx), maxS);
    const times = timesFromSlotRange(eff, d, slots);
    if (!times) return;
    onDraftChange({
      ...draft,
      subjectId,
      startTime: times.startTime,
      endTime: times.endTime,
    });
  };

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
        aria-labelledby="gec-plot-schedule-modal-title"
        className={`w-full max-w-lg max-h-[min(90vh,720px)] overflow-y-auto rounded-xl bg-white shadow-2xl border border-black/10 transition-all duration-200 ease-out ${
          animateIn && open ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-[0.97] translate-y-2"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-black/10 bg-gradient-to-r from-emerald-500/10 to-white px-5 py-4">
          <div>
            <h2 id="gec-plot-schedule-modal-title" className="text-lg font-bold text-[#780301]">
              {readOnly ? "View schedule" : isNewPlot ? "Plot vacant GEC" : "Edit vacant GEC"}
            </h2>
            <p className="text-[12px] text-black/55 mt-0.5">
              {anchorLabel}
              {sectionName ? ` · ${sectionName}` : ""}
            </p>
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
          {readOnly ? (
            <p className="text-[12px] text-black/60 rounded-lg border border-black/10 bg-gray-50 px-3 py-2">
              Major subject rows are read-only. Only <strong>vacant GEC</strong> slots (light green in the grid) can be
              edited after approval.
            </p>
          ) : null}

          {hasConflict ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 flex gap-2 text-[12px] text-red-950"
              role="alert"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
              <div className="space-y-1">
                <p className="font-semibold">Scheduling conflict detected</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {conflictDetailLines.length > 0
                    ? conflictDetailLines.map((line) => <li key={line}>{line}</li>)
                    : (
                        <>
                          {conflictFlags.faculty === "Yes" ? <li>Faculty — instructor double-booked at this time</li> : null}
                          {conflictFlags.room === "Yes" ? <li>Room — already occupied at this time</li> : null}
                          {conflictFlags.section === "Yes" ? <li>Section — another class overlaps this time</li> : null}
                        </>
                      )}
                </ul>
              </div>
            </div>
          ) : null}

          <div>
            <label className={labelClass} htmlFor="gec-plot-subject">
              GEC subject
            </label>
            <select
              id="gec-plot-subject"
              className={`${fieldClass} mt-1`}
              value={draft.subjectId}
              disabled={readOnly || gecSubjects.length === 0}
              onChange={(e) => {
                const subjectId = e.target.value;
                if (!subjectId) {
                  onDraftChange({ ...draft, subjectId: "" });
                  return;
                }
                onDurationSlotsChange(1);
                applySlotFromIndex(effectiveStart, subjectId, 1);
              }}
            >
              <option value="">Select GEC subject…</option>
              {availableSubjects.length > 0 ? (
                <optgroup label="Available">
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.title}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {addAnotherSlotSubjects.length > 0 ? (
                <optgroup label="Add another time slot (same subject)">
                  {addAnotherSlotSubjects.map((s) => (
                    <option key={`split-${s.id}`} value={s.id}>
                      + {s.code} — {s.title}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
            {pickedSummaryCode && pickedSubjectId && onApplyPickedSummary && !readOnly ? (
              <Button
                type="button"
                variant="outline"
                className="mt-2 h-8 text-[11px] w-full border-emerald-300 text-emerald-900"
                onClick={onApplyPickedSummary}
              >
                Apply from summary: {pickedSummaryCode}
              </Button>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="gec-plot-instructor">
              Instructor
            </label>
            <select
              id="gec-plot-instructor"
              className={`${fieldClass} mt-1`}
              value={draft.instructorId}
              disabled={readOnly}
              onChange={(e) => onDraftChange({ ...draft, instructorId: e.target.value })}
            >
              <option value={GEC_VACANT_INSTRUCTOR_USER_ID}>— Vacant (TBD) —</option>
              {instructorPlotOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {formatInstructorPlotOptionLabel(opt)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="gec-plot-building">
                Building
              </label>
              <select
                id="gec-plot-building"
                className={`${fieldClass} mt-1`}
                value={buildingValue}
                disabled={readOnly || buildingLabels.length === 0}
                onChange={(e) => {
                  const b = e.target.value;
                  onBuildingChange(b);
                  const keep = draft.roomId && rooms.some((r) => r.id === draft.roomId && roomBuildingKey(r) === b);
                  if (!keep) onDraftChange({ ...draft, roomId: "" });
                }}
              >
                <option value="">Select building…</option>
                {buildingLabels.map((b) => (
                  <option key={b} value={b}>
                    {campusNavigationBuildingOptionLabel(b)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="gec-plot-room">
                Room
              </label>
              <select
                id="gec-plot-room"
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
              <label className={labelClass} htmlFor="gec-plot-day">
                Day
              </label>
              <select
                id="gec-plot-day"
                className={`${fieldClass} mt-1`}
                value={draft.day}
                disabled={readOnly}
                onChange={(e) => onDraftChange({ ...draft, day: e.target.value as BsitEvaluatorWeekday })}
              >
                {days.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="gec-plot-start">
                Time slot (start)
              </label>
              <select
                id="gec-plot-start"
                className={`${fieldClass} mt-1`}
                value={effectiveStart}
                disabled={readOnly || !draft.subjectId}
                onChange={(e) => applySlotFromIndex(parseInt(e.target.value, 10), draft.subjectId, durationSlots)}
              >
                {slots
                  .filter((t) => isEvaluatorSlotPlottable(programMode, draft.day || days[0] || "Monday", t))
                  .map((t) => (
                  <option key={`${t.slotIndex}-${t.label}`} value={t.slotIndex}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {sub && maxDur > 1 ? (
            <div>
              <label className={labelClass} htmlFor="gec-plot-duration">
                Duration (consecutive hours this meeting)
              </label>
              <select
                id="gec-plot-duration"
                className={`${fieldClass} mt-1`}
                value={dur}
                disabled={readOnly}
                onChange={(e) => {
                  const nextDur = parseInt(e.target.value, 10) || 1;
                  onDurationSlotsChange(nextDur);
                  applySlotFromIndex(effectiveStart, draft.subjectId, nextDur);
                }}
              >
                {Array.from({ length: maxDur }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>
                    {h} hour{h === 1 ? "" : "s"} (max {maxDur} for this subject)
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-black/50 mt-1">
                To split contact across different days or times, use 1 hour and plot the same GEC subject again.
              </p>
            </div>
          ) : null}

          <p className="text-[12px] font-medium text-black/60 rounded-lg bg-emerald-500/8 border border-emerald-400/25 px-3 py-2">
            Preview: <span className="text-black/85">{timeLine}</span>
            {sub ? (
              <span className="text-black/50">
                {" "}
                · {dur} consecutive hour{dur === 1 ? "" : "s"}
              </span>
            ) : null}
          </p>
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-black/10 bg-white/95 backdrop-blur px-5 py-4">
          {!isNewPlot && onRemove && !readOnly ? (
            <Button type="button" variant="outline" className="mr-auto text-red-800 border-red-200" onClick={onRemove}>
              Remove schedule
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly ? (
            <Button
              type="button"
              className="bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold min-w-[120px]"
              onClick={onApply}
            >
              {isNewPlot ? "Plot schedule" : "Save changes"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
