"use client";

import { NoInstructorsNotice } from "@/components/evaluator/NoInstructorsNotice";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  evaluatorTimeSlots,
  evaluatorWeekdays,
  type BsitEvaluatorWeekday,
} from "@/lib/chairman/bsit-evaluator-constants";
import { type HourSlot, type ProgramMode } from "@/lib/scheduling/program-mode";
import { normalizeSlotHHMM } from "@/lib/chairman/evaluator-schedule-hydration";
import {
  PLOT_STEP_HOURS,
  clampPlotStartSlotIndex,
  maxPlotDurationSlotsForSubject,
  plotEntryDurationSlots,
  quantizePlotHours,
  timesFromSlotRange,
} from "@/lib/evaluator/plot-duration";
import { formatPlotTimeRange } from "@/lib/evaluator/plot-time-range";
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
  roomsInBuildingSorted,
} from "@/lib/evaluator/room-by-building";
import type { RowConflictFlags } from "@/lib/evaluator/chairman-plot-row";
import type { Building, Room, ScheduleEntry, Subject } from "@/types/db";
import {
  buildingNamesForPlotting,
  plotBuildingKeyForRoom,
  plotBuildingOptionLabel,
  sortedRoomsInBuildingNamed,
} from "@/lib/evaluator/building-options";
import { PlotRoomSearch } from "@/components/evaluator/PlotRoomSearch";
import { apiFetch } from "@/lib/api/client";
import {
  busyInstructorsForMeetings,
  busyRoomIdsForMeetings,
  dedupeClashMessages,
  ordinalFloor,
  rankRoomSuggestions,
  type MeetingTime,
} from "@/lib/evaluator/room-suggestions";
import { plotStartConflicts } from "@/lib/evaluator/plot-start-conflicts";
import type { SparseScheduleBlock } from "@/lib/scheduling/conflicts";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";

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
  /** `Building` rows, so a room is matched to its building by id rather than by leftover text. */
  buildingsCatalog?: Building[];
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
  /** Classes already plotted this term, to stop a start that lands on one. */
  existingBlocks?: SparseScheduleBlock[];
  /** Subject code (and section) of an already-plotted entry, to name it in a clash message. */
  labelForEntry?: (entryId: string) => string | undefined;
  /**
   * Service Chair: subject, instructor, building and room are typeable pickers that list matches
   * only once something is typed, instead of long dropdowns.
   */
  searchable?: boolean;
  /** "Add instructors" link target (CAS Admin: their own Faculty Profile). */
  facultyProfileHref?: string;
};

const EMPTY_BLOCKS: SparseScheduleBlock[] = [];

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
  buildingsCatalog = [],
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
  existingBlocks = EMPTY_BLOCKS,
  labelForEntry,
  searchable = false,
  facultyProfileHref = "/admin/gec/faculty-profile",
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
      return sub ? "Type a start time and choose at least one day" : "Select a general subject, then type a start time";
    }
    return resolved.meetings
      .map((m) => `${m.day} ${formatPlotTimeRange(m.startSlotIndex, m.durationSlots, slots)}`)
      .join(" · ");
  }, [meetings, slots, programMode, maxDur, days, sub]);

  /** Each day's start + duration against classes already plotted, named in the message. */
  const startConflicts = useMemo(() => {
    if (readOnly) return [] as string[];
    const resolved = resolvePlotMeetings(meetings, { slots, programMode, maxDur, weekdays: days });
    if (!resolved.ok) return [] as string[];
    return plotStartConflicts({
      meetings: resolved.meetings,
      base: {
        id: draft.id,
        academicPeriodId: draft.academicPeriodId,
        sectionId: draft.sectionId,
        instructorId: draft.instructorId,
        roomId: draft.roomId,
      },
      slots,
      programMode,
      existingBlocks,
      labelForEntry,
    });
  }, [meetings, slots, programMode, maxDur, days, draft.id, draft.academicPeriodId, draft.sectionId, draft.instructorId, draft.roomId, existingBlocks, labelForEntry, readOnly]);
  const roomsInB = useMemo(
    () => (buildingValue ? sortedRoomsInBuildingNamed(rooms, buildingValue, buildingsCatalog) : []),
    [rooms, buildingValue, buildingsCatalog],
  );

  const { availableSubjects, addAnotherSlotSubjects } = useMemo(() => {
    const isCurrent = (id: string) => id === draft.subjectId;
    const available = gecSubjects.filter((s) => !plottedGecSubjectIds.has(s.id) || isCurrent(s.id));
    const addAnother = gecSubjects.filter((s) => plottedGecSubjectIds.has(s.id) && !isCurrent(s.id));
    return { availableSubjects: available, addAnotherSlotSubjects: addAnother };
  }, [gecSubjects, plottedGecSubjectIds, draft.subjectId]);

  const hasConflict =
    conflictFlags.faculty === "Yes" || conflictFlags.room === "Yes" || conflictFlags.section === "Yes";

  const missingSubject = !draft.subjectId;
  /** Prof X (TBA) counts as chosen; only "Select instructor…" is missing. */
  const missingInstructor = !draft.instructorId;
  const missingRoom = !draft.roomId;
  const missingBuilding = !buildingValue;
  /** Building and Room open only after Instructor → General subject. */
  const roomPickReady = Boolean(draft.instructorId && draft.subjectId);
  const roomPickHint = !draft.instructorId
    ? "Select instructor first"
    : !draft.subjectId
      ? "Select general subject first"
      : "";
  const missingDay = !meetings.slots[0]?.day;
  const missingTime = !meetings.timeText.trim();
  const plotIncomplete =
    missingSubject || missingInstructor || missingRoom || missingBuilding || missingDay || missingTime;
  const hoursOverLimit =
    Boolean(subjectHourBudget) &&
    hoursExceedSubjectRequirement({
      requiredHours: subjectHourBudget?.required ?? 0,
      alreadyPlottedHours: subjectHourBudget?.alreadyPlotted ?? 0,
      additionalHours,
    });
  const incompleteField = `${fieldClass} mt-1 ring-2 ring-red-500 border-red-400 bg-red-50/70`;
  const incompleteFieldBare = `${fieldClass} ring-2 ring-red-500 border-red-400 bg-red-50/70`;

  /** Every meeting being plotted (each day with its own start and duration), as clock times. */
  const meetingTimes = useMemo<MeetingTime[]>(() => {
    if (!sub) return [];
    const resolved = resolvePlotMeetings(meetings, { slots, programMode, maxDur, weekdays: days });
    if (!resolved.ok) return [];
    return resolved.meetings
      .map((m): MeetingTime | null => {
        const t = timesFromSlotRange(m.startSlotIndex, m.durationSlots, slots);
        return t ? { day: m.day, startTime: t.startTime, endTime: t.endTime } : null;
      })
      .filter((m): m is MeetingTime => m != null);
  }, [sub, meetings, slots, programMode, maxDur, days]);

  /** Instructors already teaching then: every meeting once set, else the clicked time slot. */
  const busyInstructorIds = useMemo(() => {
    const times: MeetingTime[] =
      meetingTimes.length > 0
        ? meetingTimes
        : draft.day && draft.startTime && draft.endTime
          ? [{ day: draft.day, startTime: draft.startTime, endTime: draft.endTime }]
          : [];
    if (times.length === 0) return new Map<string, string | null>();
    return busyInstructorsForMeetings({
      instructorIds: instructorPlotOptions.map((o) => o.id),
      meetings: times,
      existingBlocks: existingBlocks ?? [],
      academicPeriodId: draft.academicPeriodId,
      programMode,
      excludeId: draft.id,
    });
  }, [meetingTimes, draft.day, draft.startTime, draft.endTime, instructorPlotOptions, existingBlocks, draft.academicPeriodId, programMode, draft.id]);

  /** Rooms taken on ANY of those meetings: disabled / left out, and never suggested. */
  const busyRoomIds = useMemo(
    () =>
      meetingTimes.length === 0
        ? new Set<string>()
        : busyRoomIdsForMeetings({
            rooms,
            meetings: meetingTimes,
            existingBlocks: existingBlocks ?? [],
            academicPeriodId: draft.academicPeriodId,
            programMode,
            excludeId: draft.id,
          }),
    [meetingTimes, rooms, existingBlocks, draft.academicPeriodId, programMode, draft.id],
  );
  const fullBuildings = useMemo(() => {
    const full = new Set<string>();
    if (busyRoomIds.size === 0) return full;
    for (const b of buildingLabels) {
      const inB = sortedRoomsInBuildingNamed(rooms, b, buildingsCatalog);
      if (inB.length > 0 && inB.every((rm) => busyRoomIds.has(rm.id))) full.add(b);
    }
    return full;
  }, [busyRoomIds, buildingLabels, rooms, buildingsCatalog]);

  const buildingSearchOptions = useMemo<SearchSelectOption[]>(
    () =>
      buildingLabels
        .filter((b) => !fullBuildings.has(b) || b === buildingValue)
        .map((b) => ({
          value: b,
          label: plotBuildingOptionLabel(b, campusNavigationBuildingOptionLabel),
        })),
    [buildingLabels, fullBuildings, buildingValue],
  );
  const roomSearchOptions = useMemo<SearchSelectOption[]>(
    () =>
      roomsInB
        .filter((r) => !busyRoomIds.has(r.id) || r.id === draft.roomId)
        .map((r) => ({ value: r.id, label: formatRoomOptionLabel(r) })),
    [roomsInB, busyRoomIds, draft.roomId],
  );

  /** Where this subject has met before (any term or section): roomId → meetings. */
  const usageCode = (sub?.code ?? "").trim();
  const [roomUsage, setRoomUsage] = useState<Map<string, number>>(() => new Map());
  useEffect(() => {
    if (!open || !usageCode) {
      setRoomUsage(new Map());
      return;
    }
    let cancelled = false;
    apiFetch<{ usage: { roomId: string; count: number }[] }>(
      `/api/catalog/room-usage?subjectCode=${encodeURIComponent(usageCode)}`,
      { method: "GET" },
    )
      .then((res) => {
        if (!cancelled) setRoomUsage(new Map((res.usage ?? []).map((u) => [u.roomId, u.count])));
      })
      .catch(() => {
        if (!cancelled) setRoomUsage(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [open, usageCode]);

  const roomSuggestions = useMemo(() => {
    if (readOnly || !sub || meetingTimes.length === 0) return [];
    return rankRoomSuggestions({
      rooms,
      usage: roomUsage,
      subjectCode: usageCode,
      programId: null,
      wantLab: (sub.labHours ?? 0) > 0 && (sub.lecHours ?? 0) === 0,
      busy: busyRoomIds,
    });
  }, [readOnly, sub, meetingTimes.length, rooms, roomUsage, usageCode, busyRoomIds]);

  function pickRoom(room: Room) {
    onBuildingChange(plotBuildingKeyForRoom(room, buildingsCatalog));
    onDraftChange({ ...draft, roomId: room.id });
  }

  // Fill the room once per subject when it has met there before and nothing is picked yet.
  const autoRoomForRef = useRef<string>("");
  useEffect(() => {
    if (!open || readOnly || draft.roomId) return;
    const best = roomSuggestions[0];
    const key = `${draft.sectionId}|${usageCode}`;
    if (!best || autoRoomForRef.current === key) return;
    if ((roomUsage.get(best.room.id) ?? 0) === 0) return;
    autoRoomForRef.current = key;
    pickRoom(best.room);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, readOnly, draft.roomId, draft.sectionId, usageCode, roomSuggestions, roomUsage]);

  function pickSubject(subjectId: string) {
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
  }

  function pickBuilding(b: string) {
    onBuildingChange(b);
    const keep =
      draft.roomId && sortedRoomsInBuildingNamed(rooms, b, buildingsCatalog).some((r) => r.id === draft.roomId);
    if (!keep) onDraftChange({ ...draft, roomId: "" });
  }

  const applySlotFromIndex = (idx: number, subjectId: string, slotDur = durationSlots) => {
    const subject = gecSubjects.find((s) => s.id === subjectId);
    const d = plotEntryDurationSlots(programCode, subject, slotDur);
    const eff = clampPlotStartSlotIndex(Math.max(0, idx), d, slots);
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
    // Use the meeting Day field as source of truth — do not fall back to a stale draft.day
    // when the user clears Day 1 (that left Hours stuck at 1 while Day looked blank).
    const day = first?.day ?? "";
    const durRaw = (first?.durationHours ?? "").trim();
    /* `parseInt` truncated "1.5" to 1, silently shortening every half-hour meeting as it was typed. */
    const parsedDur = durRaw ? quantizePlotHours(parseFloat(durRaw)) : NaN;
    const durHours =
      !day
        ? 0
        : Number.isFinite(parsedDur) && parsedDur >= PLOT_STEP_HOURS
          ? parsedDur
          : 0;
    onDurationSlotsChange(durHours);
    const idx =
      day && next.timeText.trim()
        ? slotIndexFromTypedTime(next.timeText, slots, day, programMode)
        : null;
    const times =
      idx != null && durHours >= PLOT_STEP_HOURS ? timesFromSlotRange(idx, durHours, slots) : null;
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
    // Not saved while a day lands on a class that is already plotted (already listed in the issues box).
    if (startConflicts.length > 0) return;
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
        <div className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-black/10 bg-white bg-gradient-to-r from-[#e8f8f1] to-white px-5 py-4 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <div>
            <h2 id="gec-plot-schedule-modal-title" className="text-lg font-bold text-[#780301]">
              {readOnly ? "View schedule" : isNewPlot ? "Plot general subject" : "Edit general subject"}
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
          {subjectHourBudget && sub?.code && !readOnly ? (
            <SubjectWeeklyHoursBanner
              requiredHours={subjectHourBudget.required}
              alreadyPlottedHours={subjectHourBudget.alreadyPlotted}
              additionalHours={additionalHours}
            />
          ) : null}
          {readOnly ? (
            <p className="text-[12px] text-black/60 rounded-lg border border-black/10 bg-gray-50 px-3 py-2">
              Major and assigned (non-vacant) rows are locked. Only <strong>vacant general-subject</strong> slots (light green)
              in this college / department can be plotted, edited, or removed.
            </p>
          ) : null}

          <div>
            <label className={labelClass} htmlFor="gec-plot-instructor">
              Instructor
            </label>
            {/* A select listing every instructor (Prof X first), for every role. */}
            <select
              id="gec-plot-instructor"
              className={missingInstructor && !readOnly ? incompleteField : `${fieldClass} mt-1`}
              value={draft.instructorId}
              disabled={readOnly}
              onChange={(e) => onDraftChange({ ...draft, instructorId: e.target.value })}
            >
              <option value="">Select instructor…</option>
              <option value={GEC_VACANT_INSTRUCTOR_USER_ID}>Prof X (TBA) — no instructor yet</option>
              {instructorPlotOptions.map((opt) => {
                const busy = busyInstructorIds.has(opt.id) && draft.instructorId !== opt.id;
                return (
                  <option key={opt.id} value={opt.id} disabled={busy}>
                    {formatInstructorPlotOptionLabel(opt)}
                    {busy ? " — Busy at this time" : ""}
                  </option>
                );
              })}
            </select>
            {instructorPlotOptions.length === 0 && !readOnly ? (
              <NoInstructorsNotice compact gec facultyProfileHref={facultyProfileHref} />
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="gec-plot-subject">
              General subject
            </label>
            {/* A select, for everyone: the list is the Summary of Subjects for this section (short). */}
            <select
              id="gec-plot-subject"
              className={missingSubject && !readOnly ? incompleteField : `${fieldClass} mt-1`}
              value={draft.subjectId}
              disabled={readOnly || gecSubjects.length === 0 || !draft.instructorId}
              onChange={(e) => pickSubject(e.target.value)}
            >
              <option value="">{draft.instructorId ? "Select general subject…" : "Select instructor first…"}</option>
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
            Preview:{" "}
            {/* One line per day: each meeting has its own start and duration. */}
            {timeLine.split(" · ").map((line, i) => (
              <span key={`${line}-${i}`} className={`${i > 0 ? "block pl-[3.6rem]" : ""} text-black/85`}>
                {line}
              </span>
            ))}
            {sub && additionalHours > 0 ? (
              <span className="text-black/50">
                {" "}
                · {additionalHours} hour{additionalHours === 1 ? "" : "s"} total
              </span>
            ) : null}
          </p>
          {roomSuggestions.length > 0 ? (
            <div className="rounded-lg border border-emerald-300/50 bg-emerald-50/60 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-black/75">
                <Sparkles className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
                Suggested rooms for {usageCode} (free at this time)
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {roomSuggestions.map(({ room, reason }) => {
                  const picked = draft.roomId === room.id;
                  const floor = ordinalFloor(room.floor);
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => pickRoom(room)}
                      aria-pressed={picked}
                      className={`rounded-lg border px-2.5 py-1.5 text-left transition ${
                        picked ? "border-[#780301] bg-[#780301] text-white" : "border-black/15 bg-white text-black hover:border-emerald-500"
                      }`}
                    >
                      <span className="block text-[12.5px] font-semibold">
                        {formatRoomOptionLabel(room)}
                        {floor ? <span className={picked ? "text-white/80" : "text-black/55"}> · {floor}</span> : null}
                      </span>
                      <span className={`block text-[11px] ${picked ? "text-white/80" : "text-black/55"}`}>{reason}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!readOnly && roomPickReady ? (
            <PlotRoomSearch
              rooms={rooms}
              buildingsCatalog={buildingsCatalog}
              busyRoomIds={busyRoomIds}
              currentRoomId={draft.roomId}
              onPick={(b, roomId) => {
                onBuildingChange(b);
                onDraftChange({ ...draft, roomId });
              }}
            />
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="gec-plot-building">
                Building
              </label>
              {searchable ? (
                <SearchSelect
                  id="gec-plot-building"
                  ariaLabel="Building"
                  className="mt-1"
                  inputClassName={missingBuilding && !readOnly ? incompleteFieldBare : fieldClass}
                  placeholder={roomPickHint || "Type a building…"}
                  options={buildingSearchOptions}
                  value={buildingValue}
                  disabled={readOnly || buildingLabels.length === 0 || !roomPickReady}
                  onChange={pickBuilding}
                />
              ) : (
              <select
                id="gec-plot-building"
                className={missingBuilding && !readOnly ? incompleteField : `${fieldClass} mt-1`}
                value={buildingValue}
                disabled={readOnly || buildingLabels.length === 0 || !roomPickReady}
                onChange={(e) => pickBuilding(e.target.value)}
              >
                <option value="">{roomPickHint || "Select building…"}</option>
                {buildingLabels.map((b) => {
                  const full = fullBuildings.has(b);
                  return (
                    <option key={b} value={b} disabled={full && buildingValue !== b}>
                      {plotBuildingOptionLabel(b, campusNavigationBuildingOptionLabel)}
                      {full ? " — No free room at this time" : ""}
                    </option>
                  );
                })}
              </select>
              )}
            </div>
            <div>
              <label className={labelClass} htmlFor="gec-plot-room">
                Room
              </label>
              {searchable ? (
                <SearchSelect
                  id="gec-plot-room"
                  ariaLabel="Room"
                  className="mt-1"
                  inputClassName={missingRoom && !readOnly ? incompleteFieldBare : fieldClass}
                  placeholder={roomPickHint || (buildingValue ? "Type a room…" : "Select building first")}
                  options={roomSearchOptions}
                  value={draft.roomId}
                  disabled={readOnly || !buildingValue || !roomPickReady}
                  onChange={(v) => onDraftChange({ ...draft, roomId: v })}
                />
              ) : (
              <select
                id="gec-plot-room"
                className={missingRoom && !readOnly ? incompleteField : `${fieldClass} mt-1`}
                value={draft.roomId}
                disabled={readOnly || !buildingValue || !roomPickReady}
                onChange={(e) => onDraftChange({ ...draft, roomId: e.target.value })}
              >
                <option value="">{roomPickHint || (buildingValue ? "Select room…" : "Select building first")}</option>
                {roomsInB.map((r) => {
                  const busy = busyRoomIds.has(r.id);
                  return (
                    <option key={r.id} value={r.id} disabled={busy && draft.roomId !== r.id}>
                      {formatRoomOptionLabel(r)}
                      {busy ? " — Occupied" : ""}
                    </option>
                  );
                })}
              </select>
              )}
            </div>
          </div>

          {(() => {
            const issues = readOnly
              ? []
              : dedupeClashMessages([
                  ...(hasConflict
                    ? conflictDetailLines.length > 0
                      ? conflictDetailLines
                      : [
                          conflictFlags.faculty === "Yes" ? "The instructor already has a class at this time." : null,
                          conflictFlags.room === "Yes" ? "The room is already occupied at this time." : null,
                          conflictFlags.section === "Yes" ? "The section already has a class at this time." : null,
                        ]
                    : []),
                  ...startConflicts,
                ]);
            return issues.length > 0 ? (
              <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="space-y-0.5">
                  <p className="font-semibold">This plot can’t be saved yet</p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {issues.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null;
          })()}
        </div>

        <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-end gap-2 border-t border-black/10 bg-white px-5 py-4">
          {onRemove && !readOnly ? (
            <Button type="button" variant="outline" className="mr-auto text-red-800 border-red-200" onClick={onRemove}>
              Remove schedule
            </Button>
          ) : null}
          {plotIncomplete && !readOnly ? (
            <span className="mr-auto text-[11.5px] text-red-700">Complete the highlighted fields.</span>
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
