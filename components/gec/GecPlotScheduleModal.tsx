"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  evaluatorTimeSlots,
  evaluatorWeekdays,
  type BsitEvaluatorWeekday,
} from "@/lib/chairman/bsit-evaluator-constants";
import { type HourSlot, type ProgramMode } from "@/lib/scheduling/program-mode";
import { normalizeSlotHHMM } from "@/lib/chairman/evaluator-schedule-hydration";
import {
  clampPlotStartSlotIndex,
  maxPlotDurationSlotsForSubject,
  plotEntryDurationSlots,
  timesFromSlotRange,
} from "@/lib/evaluator/plot-duration";
import { PlotMeetingSlotsFields } from "@/components/evaluator/PlotMeetingSlotsFields";
import {
  resolvePlotMeetings,
  seedPlotMeetingsDraft,
  totalPlotMeetingHours,
  type PlotMeetingsDraft,
  type ResolvedPlotMeeting,
} from "@/lib/evaluator/plot-meetings";
import { slotIndexFromTypedTime } from "@/lib/evaluator/plot-time-input";
import { campusNavigationBuildingOptionLabel } from "@/lib/campus/campus-navigation-catalog";
import { GEC_VACANT_INSTRUCTOR_USER_ID } from "@/lib/gec/gec-vacant";
import {
  hoursExceedSubjectRequirement,
} from "@/lib/scheduling/subject-semester-hours";
import { SubjectWeeklyHoursBanner } from "@/components/evaluator/SubjectWeeklyHoursBanner";
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
  onApply: (meetings: ResolvedPlotMeeting[]) => void;
  onRemove?: () => void;
  subjectHourBudget?: { required: number; alreadyPlotted: number } | null;
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
  subjectHourBudget = null,
}: GecPlotScheduleModalProps) {
  const slots = timeSlots ?? evaluatorTimeSlots(programMode);
  const days = weekdays ?? evaluatorWeekdays(programMode);
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [meetings, setMeetings] = useState<PlotMeetingsDraft>(() =>
    seedPlotMeetingsDraft({
      day: draft.day,
      startSlotIndex: startSlotIndexFromEntry(draft, slots),
      durationSlots,
      slots,
    }),
  );
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setAnimateIn(false);
      const t = window.setTimeout(() => setVisible(false), 200);
      return () => window.clearTimeout(t);
    }
    setVisible(true);
    setMeetingError(null);
    setMeetings(
      seedPlotMeetingsDraft({
        day: draft.day,
        startSlotIndex: startSlotIndexFromEntry(draft, slots),
        durationSlots,
        slots,
      }),
    );
    const t = window.requestAnimationFrame(() => setAnimateIn(true));
    return () => window.cancelAnimationFrame(t);
    // Seed from the row that opened the modal, not from later draft keystrokes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open is the reset signal
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
  const startIdx = startSlotIndexFromEntry(draft, slots);
  const additionalHours = Math.max(dur, totalPlotMeetingHours(meetings, maxDur));
  const timeLine = useMemo(() => {
    const resolved = resolvePlotMeetings(meetings, {
      slots,
      programMode,
      maxDur,
      weekdays: days,
    });
    if (!resolved.ok) {
      return sub ? "Type a start time and choose at least one day" : "Select GEC subject, then type a start time";
    }
    return resolved.meetings
      .map((m) => `${m.day} ${formatTimeRangeFromSlots(m.startSlotIndex, m.durationSlots, slots)}`)
      .join(" · ");
  }, [meetings, slots, programMode, maxDur, days, sub]);
  const roomsInB = buildingValue ? roomsInBuildingSorted(rooms, buildingValue) : [];

  const { availableSubjects, addAnotherSlotSubjects } = useMemo(() => {
    const isCurrent = (id: string) => id === draft.subjectId;
    const available = gecSubjects.filter((s) => !plottedGecSubjectIds.has(s.id) || isCurrent(s.id));
    const addAnother = gecSubjects.filter((s) => plottedGecSubjectIds.has(s.id) && !isCurrent(s.id));
    return { availableSubjects: available, addAnotherSlotSubjects: addAnother };
  }, [gecSubjects, plottedGecSubjectIds, draft.subjectId]);

  const hasConflict =
    conflictFlags.faculty === "Yes" || conflictFlags.room === "Yes" || conflictFlags.section === "Yes";

  const missingSubject = !draft.subjectId;
  const missingRoom = !draft.roomId;
  const missingBuilding = !buildingValue;
  const missingDay = !meetings.slots[0]?.day;
  const missingTime = !meetings.timeText.trim();
  const plotIncomplete = missingSubject || missingRoom || missingBuilding || missingDay || missingTime;
  const hoursOverLimit =
    Boolean(subjectHourBudget) &&
    hoursExceedSubjectRequirement({
      requiredHours: subjectHourBudget?.required ?? 0,
      alreadyPlottedHours: subjectHourBudget?.alreadyPlotted ?? 0,
      additionalHours,
    });
  const incompleteField = `${fieldClass} mt-1 ring-2 ring-red-500 border-red-400 bg-red-50/70`;

  const applySlotFromIndex = (idx: number, subjectId: string, slotDur = durationSlots) => {
    const subject = gecSubjects.find((s) => s.id === subjectId);
    const d = plotEntryDurationSlots(programCode, subject, slotDur);
    const eff = clampPlotStartSlotIndex(Math.max(0, idx), d, slots.length);
    const times = timesFromSlotRange(eff, d, slots);
    if (!times) return;
    onDraftChange({
      ...draft,
      subjectId,
      startTime: times.startTime,
      endTime: times.endTime,
    });
  };

  function applyMeetingsChange(next: PlotMeetingsDraft) {
    setMeetings(next);
    setMeetingError(null);
    const first = next.slots[0];
    const day = first?.day || draft.day;
    const parsedDur = parseInt(first?.durationHours || "1", 10);
    const durHours = Number.isFinite(parsedDur) && parsedDur >= 1 ? parsedDur : 1;
    onDurationSlotsChange(durHours);
    const idx =
      day && next.timeText.trim()
        ? slotIndexFromTypedTime(next.timeText, slots, day, programMode)
        : null;
    const times = idx != null ? timesFromSlotRange(idx, durHours, slots) : null;
    onDraftChange({
      ...draft,
      day,
      ...(times ? { startTime: times.startTime, endTime: times.endTime } : {}),
    });
  }

  function handleApplyMeetings() {
    const resolved = resolvePlotMeetings(meetings, {
      slots,
      programMode,
      maxDur,
      weekdays: days,
    });
    if (!resolved.ok) {
      setMeetingError(resolved.error);
      return;
    }
    onApply(resolved.meetings);
  }

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
        className={`w-full max-w-2xl max-h-[min(90vh,720px)] overflow-y-auto rounded-xl bg-white shadow-2xl border border-black/10 transition-all duration-200 ease-out ${
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
          {plotIncomplete && !readOnly ? (
            <p className="text-[12px] font-medium text-red-800 rounded-lg border border-red-200 bg-red-50 px-3 py-2" role="status">
              Complete the highlighted fields before this plot can be saved.
            </p>
          ) : null}
          {subjectHourBudget && sub?.code && !readOnly ? (
            <SubjectWeeklyHoursBanner
              requiredHours={subjectHourBudget.required}
              alreadyPlottedHours={subjectHourBudget.alreadyPlotted}
              additionalHours={additionalHours}
            />
          ) : null}
          {readOnly ? (
            <p className="text-[12px] text-black/60 rounded-lg border border-black/10 bg-gray-50 px-3 py-2">
              Major and assigned (non-vacant) rows are locked. Only <strong>vacant GEC</strong> slots (light green)
              in this college / department can be plotted, edited, or removed.
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
              className={missingSubject && !readOnly ? incompleteField : `${fieldClass} mt-1`}
              value={draft.subjectId}
              disabled={readOnly || gecSubjects.length === 0}
              onChange={(e) => {
                const subjectId = e.target.value;
                if (!subjectId) {
                  onDraftChange({ ...draft, subjectId: "" });
                  return;
                }
                onDurationSlotsChange(1);
                setMeetings((prev) => ({
                  ...prev,
                  slots: prev.slots.map((s, i) => (i === 0 ? { ...s, durationHours: "1" } : s)),
                }));
                applySlotFromIndex(Math.max(0, startIdx), subjectId, 1);
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
                className={missingBuilding && !readOnly ? incompleteField : `${fieldClass} mt-1`}
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
                className={missingRoom && !readOnly ? incompleteField : `${fieldClass} mt-1`}
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

          <PlotMeetingSlotsFields
            idPrefix="gec-plot"
            draft={meetings}
            onChange={applyMeetingsChange}
            days={days}
            maxDur={maxDur}
            readOnly={readOnly}
            incomplete={(missingDay || missingTime) && !readOnly}
            error={meetingError}
          />

          <p className="text-[12px] font-medium text-black/60 rounded-lg bg-emerald-500/8 border border-emerald-400/25 px-3 py-2">
            Preview: <span className="text-black/85">{timeLine}</span>
            {sub && additionalHours > 0 ? (
              <span className="text-black/50">
                {" "}
                · {additionalHours} hour{additionalHours === 1 ? "" : "s"} total
              </span>
            ) : null}
          </p>
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-black/10 bg-white/95 backdrop-blur px-5 py-4">
          {onRemove && !readOnly ? (
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
              disabled={hasConflict || plotIncomplete || hoursOverLimit}
              onClick={handleApplyMeetings}
            >
              {isNewPlot ? "Plot schedule" : "Save changes"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
