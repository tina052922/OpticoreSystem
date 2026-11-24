"use client";

import { requiredWeeklyContactHours } from "@/lib/scheduling/subject-semester-hours";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ExternalLink, Sparkles, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  BSIT_PLOT_SLOTS,
  BSIT_EVALUATOR_WEEKDAYS,
  type BsitEvaluatorWeekday,
} from "@/lib/chairman/bsit-evaluator-constants";
import { type HourSlot, type ProgramMode } from "@/lib/scheduling/program-mode";
import { evaluatorTimeSlots } from "@/lib/chairman/bsit-evaluator-constants";
import { plotFreeTimeNotice, sectionFreeTimeFrom } from "@/lib/evaluator/plot-free-time";
import { insFacultyScheduleHref, periodIdFromLocation } from "@/lib/ins/load-generator-href";
import { NoInstructorsNotice, facultyProfileHrefForInsBase } from "@/components/evaluator/NoInstructorsNotice";
import { type BsitSemester, type ProspectusSubjectRow } from "@/lib/chairman/bsit-prospectus";
import {
  PLOT_STEP_HOURS,
  clampPlotStartSlotIndex,
  maxPlotDurationSlots,
  MAX_PLOT_MEETING_HOURS,
  quantizePlotHours,
  plotRowDurationSlots,
  plotRowsForHours,
  plotSlotHours,
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
  meetingStartText,
} from "@/lib/evaluator/plot-meetings";
import { slotIndexFromTypedTime } from "@/lib/evaluator/plot-time-input";
import { prospectusRowForProgram } from "@/lib/chairman/prospectus-registry";
import {
  hoursExceedSubjectRequirement,
} from "@/lib/scheduling/subject-semester-hours";
import { SubjectWeeklyHoursBanner } from "@/components/evaluator/SubjectWeeklyHoursBanner";
import { normalizeProspectusCode } from "@/lib/chairman/bsit-prospectus";
import {
  formatLecLabDisplay,
  formatPlotSubjectDropdownLabel,
  getLecLabPair,
  inferLecLabMode,
  lecLabModesAvailable,
  resolveSubjectCodeForLecLabMode,
  subjectRowFor,
  subjectRowsForPlotDropdown,
  subjectsForSectionPlot,
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
  roomsInBuildingSorted,
} from "@/lib/evaluator/room-by-building";
import {
  detectConflictsSparse,
  type SparseScheduleBlock,
} from "@/lib/scheduling/conflicts";
import {
  MAX_OFFERING_ENROLLMENT,
  enrollmentForOffering,
  isCompleteEnrollment,
  parseEnrollmentInput,
} from "@/lib/scheduling/offering-enrollment";
import type { PlotRow } from "@/lib/evaluator/chairman-plot-row";
import type { Building, Room, Section } from "@/types/db";
import type { RowConflictFlags } from "@/lib/evaluator/chairman-plot-row";
import {
  buildingNamesForPlotting,
  plotBuildingKeyForRoom,
  plotBuildingOptionLabel,
  sortedRoomsInBuildingNamed,
} from "@/lib/evaluator/building-options";
import {
  busyInstructorsForMeetings,
  busyRoomIdsForMeetings,
  dedupeClashMessages,
  ordinalFloor,
  rankRoomSuggestions,
  type MeetingTime,
} from "@/lib/evaluator/room-suggestions";
import { PlotRoomSearch } from "@/components/evaluator/PlotRoomSearch";
import { plotStartConflicts } from "@/lib/evaluator/plot-start-conflicts";
import { apiFetch } from "@/lib/api/client";

const fieldClass =
  "w-full min-h-10 rounded-lg border border-black/20 bg-white px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";
const labelClass = "text-[12px] font-semibold text-black/75";

function buildCandidateBlock(
  draft: PlotRow,
  overrides: Partial<PlotRow>,
  academicPeriodId: string,
  programCodeForSummary: string,
  slots: { label: string; startTime: string; endTime: string }[] = BSIT_PLOT_SLOTS,
  programMode: ProgramMode = "day",
): SparseScheduleBlock | null {
  const merged = { ...draft, ...overrides };
  if (!merged.subjectCode || !merged.day) return null;
  const pr = prospectusRowForProgram(programCodeForSummary, merged.subjectCode);
  const dur = plotRowDurationSlots(pr, merged);
  // Rows, not hours: on the half-hour grid a 1.5 hour class covers three of them.
  const maxS = slots.length - plotRowsForHours(dur, plotSlotHours(slots));
  const startIdx = clampPlotStartSlotIndex(
    merged.startSlotIndex < 0 ? 0 : merged.startSlotIndex,
    dur,
    slots,
  );
  if (startIdx < 0 || startIdx > maxS) return null;
  const times = timesFromSlotRange(startIdx, dur, slots);
  if (!times) return null;
  return {
    id: merged.id,
    academicPeriodId,
    day: merged.day,
    startTime: times.startTime,
    endTime: times.endTime,
    instructorId: merged.instructorId || null,
    sectionId: merged.sectionId || null,
    roomId: merged.roomId || null,
    programMode,
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
  catalogSubjectRows?: ProspectusSubjectRow[];
  majorOptions: MajorOption[];
  programSections: Section[];
  instructorPlotOptions: InstructorPlotOption[];
  roomsForEvaluatorGrid: Room[];
  buildingLabelsForGrid: string[];
  /** `Building` rows, so a room is matched to its building by id rather than by leftover text. */
  buildingsCatalog?: Building[];
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
  /** Subject code (and section) of an already-plotted entry, to name it in a clash message. */
  labelForEntry?: (entryId: string) => string | undefined;
  /** Instructor weekly teaching-hours snapshot (current campus-wide hours + cap) for the live overload indicator. */
  instructorLoadById?: Map<string, { hours: number; cap: number }>;
  /**
   * Enrollment already entered per offering (`offeringKey(sectionId, subjectCode)`), so a second
   * meeting of a subject inherits the first one's figure instead of asking for it again.
   */
  plottedEnrollment?: ReadonlyMap<string, number>;
  /** Required weekly contact vs hours already plotted for this section + subject (excluding this draft). */
  subjectHourBudget?: { required: number; alreadyPlotted: number } | null;
  /**
   * Hours already plotted in this section per subject code (normalized), not counting the class
   * being edited. A subject whose required weekly hours are all plotted is disabled in the list.
   */
  plottedHoursByCode?: ReadonlyMap<string, number>;
  readOnly: boolean;
  isNewPlot: boolean;
  anchorLabel: string;
  weekdays?: readonly BsitEvaluatorWeekday[];
  timeSlots?: HourSlot[];
  programMode?: ProgramMode;
  onApply: (meetings: ResolvedPlotMeeting[]) => void;
  /** INS Forms Generator for this role (e.g. `/chairman/ins`), for "View schedule" on a busy instructor. */
  insFormBasePath?: string;
};

export function ChairmanPlotScheduleModal({
  open,
  onClose,
  draft,
  onDraftChange,
  buildingValue,
  onBuildingChange,
  programCodeForSummary,
  catalogSubjectRows,
  majorOptions,
  programSections,
  instructorPlotOptions,
  roomsForEvaluatorGrid,
  buildingLabelsForGrid,
  buildingsCatalog = [],
  sectionNameById,
  termProspectusSemester,
  plottedCodesBySectionId,
  plottedHoursByCode,
  plottedEnrollment,
  conflictFlags,
  conflictDetailLines = [],
  academicPeriodId,
  existingBlocks,
  labelForEntry,
  instructorLoadById,
  subjectHourBudget = null,
  readOnly,
  isNewPlot,
  anchorLabel,
  weekdays = BSIT_EVALUATOR_WEEKDAYS,
  timeSlots,
  programMode = "day",
  onApply,
  insFormBasePath = "/chairman/ins",
}: ChairmanPlotScheduleModalProps) {
  const slots = timeSlots ?? evaluatorTimeSlots(programMode);
  const days = weekdays;
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [meetings, setMeetings] = useState<PlotMeetingsDraft>(() =>
    seedPlotMeetingsDraft({
      day: draft.day,
      startSlotIndex: draft.startSlotIndex,
      durationSlots: draft.durationSlots,
      slots,
    }),
  );
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  /** The figure to show for the offering now in the draft, in `enrollmentForOffering`'s order. */
  const seedEnrollmentFor = useCallback(
    (row: PlotRow) =>
      enrollmentForOffering({
        sectionId: row.sectionId,
        subjectCode: row.subjectCode,
        draft: row,
        plotted: plottedEnrollment,
      }),
    [plottedEnrollment],
  );

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
        startSlotIndex: draft.startSlotIndex,
        durationSlots: draft.durationSlots,
        slots,
      }),
    );
    /*
     * Show what the section already carries rather than an empty box: a second subject plotted for
     * a section the user has already given an enrollment should not ask for it again.
     */
    const seeded = seedEnrollmentFor(draft);
    if (seeded !== draft.students) onDraftChange({ ...draft, students: seeded });
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

  /** Prospectus first, then Subject Codes — the same order every lookup in this modal uses. */
  const rowForCode = useCallback(
    (code: string) => subjectRowFor(programCodeForSummary, code, catalogSubjectRows),
    [programCodeForSummary, catalogSubjectRows],
  );
  const durationSource = draft.subjectCode ? rowForCode(draft.subjectCode) : undefined;
  const dur = plotRowDurationSlots(durationSource, draft);
  // A subject with no hours on record is not held to one hour.
  const maxDur = durationSource ? maxPlotDurationSlots(durationSource) : MAX_PLOT_MEETING_HOURS;
  const additionalHours = Math.max(dur, totalPlotMeetingHours(meetings, maxDur));
  const timeLine = useMemo(() => {
    const resolved = resolvePlotMeetings(meetings, {
      slots,
      programMode,
      maxDur,
      weekdays: days,
    });
    if (!resolved.ok) {
      return draft.subjectCode ? "Type a start time and choose at least one day" : "Select subject, then type a start time";
    }
    return resolved.meetings
      .map((m) => `${m.day} ${formatPlotTimeRange(m.startSlotIndex, m.durationSlots, slots)}`)
      .join(" · ");
  }, [meetings, slots, programMode, maxDur, days, draft.subjectCode]);

  /**
   * Each day's typed start + duration checked against classes already plotted (this section, the
   * chosen instructor, the chosen room) — named, so the person knows what is in the way.
   */
  const startConflicts = useMemo(() => {
    if (readOnly) return [] as string[];
    const resolved = resolvePlotMeetings(meetings, { slots, programMode, maxDur, weekdays: days });
    if (!resolved.ok) return [] as string[];
    return plotStartConflicts({
      meetings: resolved.meetings,
      base: {
        id: draft.id,
        academicPeriodId,
        sectionId: draft.sectionId,
        instructorId: draft.instructorId,
        roomId: draft.roomId,
      },
      slots,
      programMode,
      existingBlocks,
      labelForEntry,
    });
  }, [meetings, slots, programMode, maxDur, days, draft.id, draft.sectionId, draft.instructorId, draft.roomId, academicPeriodId, existingBlocks, labelForEntry, readOnly]);
  /**
   * The server's own check, before saving: it sees every class on campus (other colleges too), which
   * the list above may not. Asked a moment after the plot settles; its clashes show here and keep
   * "Plot schedule" disabled, instead of failing on save. A failed check never blocks.
   */
  const [serverConflicts, setServerConflicts] = useState<string[]>([]);
  const [serverChecking, setServerChecking] = useState(false);
  const serverCheckKey = useMemo(() => {
    if (readOnly || !academicPeriodId || !draft.sectionId) return "";
    const resolved = resolvePlotMeetings(meetings, { slots, programMode, maxDur, weekdays: days });
    if (!resolved.ok) return "";
    const rows = resolved.meetings
      .map((m, i) => {
        const t = timesFromSlotRange(m.startSlotIndex, m.durationSlots, slots);
        if (!t) return null;
        return {
          id: i === 0 ? draft.id : `${draft.id}-check-${i}`,
          academicPeriodId,
          sectionId: draft.sectionId,
          instructorId: draft.instructorId || null,
          roomId: draft.roomId || null,
          day: m.day,
          startTime: t.startTime,
          endTime: t.endTime,
          programMode,
        };
      })
      .filter(Boolean);
    return rows.length ? JSON.stringify(rows) : "";
  }, [readOnly, academicPeriodId, draft.id, draft.sectionId, draft.instructorId, draft.roomId, meetings, slots, programMode, maxDur, days]);
  useEffect(() => {
    if (!serverCheckKey) {
      setServerConflicts([]);
      setServerChecking(false);
      return;
    }
    let cancelled = false;
    setServerChecking(true);
    const t = window.setTimeout(() => {
      apiFetch<{ ok: boolean; conflicts?: { message?: string }[] }>("/api/catalog/schedule-entries-upsert?dryRun=1", {
        method: "POST",
        body: JSON.parse(serverCheckKey),
      })
        .then((r) => {
          if (cancelled) return;
          const msgs = [...new Set((r.conflicts ?? []).map((c) => c.message).filter((m): m is string => Boolean(m)))];
          setServerConflicts(msgs);
        })
        .catch(() => {
          if (!cancelled) setServerConflicts([]); // the save itself still checks
        })
        .finally(() => {
          if (!cancelled) setServerChecking(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [serverCheckKey]);

  /*
   * Plain-language reason a start does not work, e.g. 9:30 with a class at 10:00 leaves 30 min,
   * shorter than any allowed meeting. Without it the user only saw an hours/conflict error.
   */
  const freeTimeNotices = useMemo(() => {
    if (!draft.sectionId || readOnly) return [] as string[];
    const out: string[] = [];
    for (const [slotIndex, slot] of meetings.slots.entries()) {
      const day = slot.day?.trim();
      const start = meetingStartText(meetings, slotIndex);
      if (!day || !start) continue;
      const idx = slotIndexFromTypedTime(start, slots, day, programMode);
      const startTime = idx == null ? null : slots[idx]?.startTime;
      if (!startTime) continue;
      const hrs = parseFloat(slot.durationHours);
      const msg = plotFreeTimeNotice({
        day,
        startTime,
        durationHours: Number.isFinite(hrs) ? hrs : null,
        free: sectionFreeTimeFrom({
          sectionId: draft.sectionId,
          day,
          startTime,
          blocks: existingBlocks,
          slots,
          excludeId: draft.id,
        }),
      });
      if (msg) out.push(msg);
    }
    return out;
  }, [meetings, slots, programMode, draft.sectionId, draft.id, existingBlocks, readOnly]);
  const sectionName = draft.sectionId
    ? (sectionNameById.get(draft.sectionId) ?? "")
    : "";
  const yearLevel = sectionName
    ? yearLevelFromSchedulingSectionName(sectionName)
    : null;

  /** "CC-112 in BSIT 3A" — names the offering the figure belongs to, not just the section. */
  const offeringLabel =
    draft.subjectCode && sectionName ? `${draft.subjectCode} in ${sectionName}` : "";

  const rawSubjectOptions = useMemo(() => {
    const forSection = subjectRowsForPlotDropdown(
      programCodeForSummary,
      subjectsForSectionPlot({
        programCode: programCodeForSummary,
        yearLevel,
        termSemester: termProspectusSemester,
        catalogRows: catalogSubjectRows,
      }),
      catalogSubjectRows,
    );
    if (forSection.length > 0) return forSection;
    // Nothing matched the section's year/semester: offer the whole catalog rather than an empty list.
    return subjectRowsForPlotDropdown(programCodeForSummary, catalogSubjectRows ?? []);
  }, [programCodeForSummary, yearLevel, termProspectusSemester, catalogSubjectRows]);

  const subjectSelectValue = useMemo(() => {
    if (!draft.subjectCode) return "";
    const pair = getLecLabPair(programCodeForSummary, draft.subjectCode, catalogSubjectRows);
    return pair.lecCode ?? draft.subjectCode;
  }, [draft.subjectCode, programCodeForSummary, catalogSubjectRows]);

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

  /**
   * Subjects already done plotting in this section: every required weekly hour is on the grid (both
   * parts of a Lec/Lab pair). Shown, but disabled — picking one could only go over its hours. The
   * subject of the class being edited is never disabled.
   */
  const fullyPlottedSubjects = useMemo(() => {
    const full = new Map<string, { plotted: number; required: number }>();
    if (!plottedHoursByCode || plottedHoursByCode.size === 0) return full;
    for (const s of rawSubjectOptions) {
      const key = normalizeProspectusCode(s.code);
      if (key === normalizeProspectusCode(subjectSelectValue) || key === normalizeProspectusCode(draft.subjectCode)) {
        continue;
      }
      const pair = getLecLabPair(programCodeForSummary, s.code, catalogSubjectRows);
      const codes = [...new Set([pair.lecCode, pair.labCode, s.code].filter((c): c is string => Boolean(c)))];
      let plotted = 0;
      let required = 0;
      let done = true;
      for (const code of codes) {
        const row = rowForCode(code);
        const need = requiredWeeklyContactHours({
          programCode: programCodeForSummary,
          subjectCode: code,
          lecUnits: row?.lecUnits,
          labUnits: row?.labUnits,
          lecHours: row?.lecHours,
          labHours: row?.labHours,
        });
        const have = plottedHoursByCode.get(normalizeProspectusCode(code)) ?? 0;
        if (need <= 0) continue;
        required += need;
        plotted += have;
        if (have + 1e-6 < need) done = false;
      }
      if (required > 0 && done) full.set(key, { plotted, required });
    }
    return full;
  }, [plottedHoursByCode, rawSubjectOptions, subjectSelectValue, draft.subjectCode, programCodeForSummary, catalogSubjectRows, rowForCode]);

  const lecLabModes = draft.subjectCode
    ? lecLabModesAvailable(programCodeForSummary, draft.subjectCode, catalogSubjectRows)
    : [];
  const lecLabSelectable = lecLabModes.length > 1;
  const lecLabPair = draft.subjectCode
    ? getLecLabPair(programCodeForSummary, draft.subjectCode, catalogSubjectRows)
    : null;
  const lecLabIsPaired = Boolean(
    lecLabPair?.lecCode &&
      lecLabPair?.labCode &&
      lecLabPair.lecCode !== lecLabPair.labCode,
  );
  /**
   * Paired curricula encode Lec/Lab in the subject code — always derive the control
   * from that code so a stale `draft.lecLabMode` cannot desync the dropdown.
   * Unpaired combined subjects keep the explicit draft mode.
   */
  const lecLabModeValue: PlotLecLabMode = !draft.subjectCode
    ? "lec"
    : lecLabIsPaired
      ? inferLecLabMode(programCodeForSummary, draft.subjectCode, catalogSubjectRows)
      : lecLabModes.includes(draft.lecLabMode)
        ? draft.lecLabMode
        : (lecLabModes[0] ?? draft.lecLabMode ?? "lec");

  const roomsInB = buildingValue
    ? sortedRoomsInBuildingNamed(roomsForEvaluatorGrid, buildingValue, buildingsCatalog)
    : [];

  const noInstructors = instructorPlotOptions.length === 0;
  const noBuildings = buildingLabelsForGrid.length === 0;
  const noSubjectsForSection =
    Boolean(draft.sectionId) && rawSubjectOptions.length === 0;

  const hasConflict =
    conflictFlags.faculty === "Yes" ||
    conflictFlags.room === "Yes" ||
    conflictFlags.section === "Yes";

  const missingSection = !draft.sectionId;
  const missingSubject = !draft.subjectCode;
  const missingInstructor = !draft.instructorId;
  const missingRoom = !draft.roomId;
  const missingBuilding = !buildingValue;
  /** Building and Room open only after Instructor → Subject: suggestions and free rooms depend on them. */
  const roomPickReady = Boolean(draft.instructorId && draft.subjectCode);
  const roomPickHint = !draft.instructorId
    ? "Select instructor first"
    : !draft.subjectCode
      ? "Select subject first"
      : "";
  const missingDay = !meetings.slots[0]?.day;
  const missingTime = !meetings.timeText.trim();
  /** INS Form 5A has a "No. of Students" column with no other source, so a blank prints a blank. */
  const missingStudents = !isCompleteEnrollment(draft.students);
  const plotIncomplete =
    missingSection ||
    missingSubject ||
    missingInstructor ||
    missingRoom ||
    missingBuilding ||
    missingDay ||
    missingTime ||
    missingStudents;
  const hoursOverLimit =
    Boolean(subjectHourBudget) &&
    hoursExceedSubjectRequirement({
      requiredHours: subjectHourBudget?.required ?? 0,
      alreadyPlottedHours: subjectHourBudget?.alreadyPlotted ?? 0,
      additionalHours,
    });
  const incompleteField = `${fieldClass} mt-1 ring-2 ring-red-500 border-red-400 bg-red-50/70`;
  const selectedInstructorOption = instructorPlotOptions.find((o) => o.id === draft.instructorId) ?? null;

  const draftDurationHours = draft.subjectCode ? additionalHours : 0;

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

  /** Busy instructor id → the class that clashes, so "View schedule" can point straight at it. */
  const busyDays = useMemo(() => {
    if (
      !draft.instructorId ||
      !draft.subjectCode ||
      existingBlocks.length === 0
    )
      return null;
    const busy = new Set<BsitEvaluatorWeekday>();
    for (const day of days) {
      const candidate = buildCandidateBlock(
        draft,
        { day },
        academicPeriodId,
        programCodeForSummary,
        slots,
        programMode,
      );
      if (!candidate) continue;
      const hits = detectConflictsSparse(candidate, existingBlocks, draft.id);
      if (hits.some((h) => h.type === "faculty" || h.type === "section")) {
        busy.add(day);
      }
    }
    return busy;
  }, [draft, existingBlocks, academicPeriodId, programCodeForSummary]);

  /** Every meeting being plotted (each day with its own start and duration), as clock times. */
  const meetingTimes = useMemo<MeetingTime[]>(() => {
    if (!draft.subjectCode) return [];
    const resolved = resolvePlotMeetings(meetings, { slots, programMode, maxDur, weekdays: days });
    if (!resolved.ok) return [];
    return resolved.meetings
      .map((m): MeetingTime | null => {
        const t = timesFromSlotRange(m.startSlotIndex, m.durationSlots, slots);
        return t ? { day: m.day, startTime: t.startTime, endTime: t.endTime } : null;
      })
      .filter((m): m is MeetingTime => m != null);
  }, [draft.subjectCode, meetings, slots, programMode, maxDur, days]);

  /**
   * When to check instructors: every meeting once the subject and times are set; before that (the
   * flow is Instructor → Subject), the time slot that was clicked, e.g. Monday 10:00–10:30.
   */
  const instructorCheckTimes = useMemo<MeetingTime[]>(() => {
    if (meetingTimes.length > 0) return meetingTimes;
    const slot = draft.day && draft.startSlotIndex >= 0 ? slots[draft.startSlotIndex] : undefined;
    return slot ? [{ day: draft.day, startTime: slot.startTime, endTime: slot.endTime }] : [];
  }, [meetingTimes, draft.day, draft.startSlotIndex, slots]);

  /** Busy instructor id → the class that clashes, so "View schedule" can point straight at it. */
  const busyInstructorIds = useMemo(() => {
    if (instructorCheckTimes.length === 0) return null;
    return busyInstructorsForMeetings({
      instructorIds: instructorPlotOptions.map((o) => o.id),
      meetings: instructorCheckTimes,
      existingBlocks,
      academicPeriodId,
      programMode,
      excludeId: draft.id,
    });
  }, [instructorCheckTimes, instructorPlotOptions, existingBlocks, academicPeriodId, programMode, draft.id]);

  /** Rooms taken on ANY of those meetings: disabled in the Room list and never suggested. */
  const busyRoomIds = useMemo(() => {
    if (meetingTimes.length === 0) return null;
    return busyRoomIdsForMeetings({
      rooms: roomsForEvaluatorGrid,
      meetings: meetingTimes,
      existingBlocks,
      academicPeriodId,
      programMode,
      excludeId: draft.id,
    });
  }, [meetingTimes, roomsForEvaluatorGrid, existingBlocks, academicPeriodId, programMode, draft.id]);

  /** Buildings with no free room at those times: disabled in the Building list. */
  const fullBuildings = useMemo(() => {
    const full = new Set<string>();
    if (!busyRoomIds || busyRoomIds.size === 0) return full;
    for (const b of buildingLabelsForGrid) {
      const inB = sortedRoomsInBuildingNamed(roomsForEvaluatorGrid, b, buildingsCatalog);
      if (inB.length > 0 && inB.every((rm) => busyRoomIds.has(rm.id))) full.add(b);
    }
    return full;
  }, [busyRoomIds, buildingLabelsForGrid, roomsForEvaluatorGrid, buildingsCatalog]);

  /**
   * A room picked earlier that is taken at the times now set (days or start changed after picking)
   * is cleared, so the search and the Room list agree: an occupied room is never the choice.
   */
  const [roomTakenNote, setRoomTakenNote] = useState<string | null>(null);
  useEffect(() => {
    if (readOnly || !draft.roomId || !busyRoomIds?.has(draft.roomId)) return;
    const room = roomsForEvaluatorGrid.find((r) => r.id === draft.roomId);
    setRoomTakenNote(room ? formatRoomOptionLabel(room) : "The room you picked");
    onDraftChange({ ...draft, roomId: "" });
  }, [readOnly, draft, busyRoomIds, roomsForEvaluatorGrid, onDraftChange]);
  useEffect(() => {
    if (draft.roomId) setRoomTakenNote(null);
  }, [draft.roomId]);

  /** Where this subject has met before (any term or section): roomId → meetings. */
  const usageCode = (subjectSelectValue || draft.subjectCode || "").trim();
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
      .then((r) => {
        if (!cancelled) setRoomUsage(new Map((r.usage ?? []).map((u) => [u.roomId, u.count])));
      })
      .catch(() => {
        if (!cancelled) setRoomUsage(new Map()); // suggestions just lean on department and room type
      });
    return () => {
      cancelled = true;
    };
  }, [open, usageCode]);

  const sectionProgramId = programSections.find((sec) => sec.id === draft.sectionId)?.programId ?? null;
  const wantLabRoom =
    lecLabModeValue === "lab" ||
    Boolean(durationSource && (durationSource.labHours ?? 0) > 0 && (durationSource.lecHours ?? 0) === 0);

  /** Best free rooms for this subject, after Instructor → Subject (and the days / times) are chosen. */
  const roomSuggestions = useMemo(() => {
    if (readOnly || !draft.subjectCode || meetingTimes.length === 0) return [];
    return rankRoomSuggestions({
      rooms: roomsForEvaluatorGrid,
      usage: roomUsage,
      subjectCode: usageCode,
      programId: sectionProgramId,
      wantLab: wantLabRoom,
      busy: busyRoomIds ?? new Set(),
    });
  }, [readOnly, draft.subjectCode, meetingTimes.length, roomsForEvaluatorGrid, roomUsage, usageCode, sectionProgramId, wantLabRoom, busyRoomIds]);

  const pickRoom = useCallback(
    (room: Room) => {
      onBuildingChange(plotBuildingKeyForRoom(room, buildingsCatalog));
      onDraftChange({ ...draft, roomId: room.id });
    },
    [onBuildingChange, onDraftChange, draft, buildingsCatalog],
  );

  /*
   * Fill the room in for the user once per subject, but only when there is real evidence — the
   * subject has met in that room before — and nothing has been picked yet. They can still change it.
   */
  const autoRoomForRef = useRef<string>("");
  useEffect(() => {
    if (!open || readOnly || draft.roomId) return;
    const best = roomSuggestions[0];
    const key = `${draft.sectionId}|${usageCode}`;
    if (!best || autoRoomForRef.current === key) return;
    if ((roomUsage.get(best.room.id) ?? 0) === 0) return;
    autoRoomForRef.current = key;
    pickRoom(best.room);
  }, [open, readOnly, draft.roomId, draft.sectionId, usageCode, roomSuggestions, roomUsage, pickRoom]);

  function applyMeetingsChange(next: PlotMeetingsDraft) {
    setMeetings(next);
    setMeetingError(null);
    const first = next.slots[0];
    const day = (first?.day ?? "") as PlotRow["day"];
    const durRaw = (first?.durationHours ?? "").trim();
    /* `parseInt` truncated "1.5" to 1, silently shortening every half-hour meeting as it was typed. */
    const parsedDur = durRaw ? quantizePlotHours(parseFloat(durRaw)) : NaN;
    const idx =
      day && next.timeText.trim()
        ? slotIndexFromTypedTime(next.timeText, slots, day, programMode)
        : null;
    onDraftChange({
      ...draft,
      day,
      startSlotIndex: idx ?? -1,
      // Blank day → blank duration (do not keep a default 1 hour).
      durationSlots: !day
        ? undefined
        : Number.isFinite(parsedDur) && parsedDur >= PLOT_STEP_HOURS
          ? parsedDur
          : durRaw
            ? draft.durationSlots
            : undefined,
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
    const first = resolved.meetings[0];
    if (first) {
      onDraftChange({
        ...draft,
        day: first.day,
        startSlotIndex: first.startSlotIndex,
        durationSlots: first.durationSlots,
      });
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
        aria-labelledby="plot-schedule-modal-title"
        className={`w-full max-w-2xl max-h-[min(90vh,720px)] overflow-y-auto rounded-xl bg-white shadow-2xl border border-black/10 transition-all duration-200 ease-out ${
          animateIn && open
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-[0.97] translate-y-2"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Opaque: the old 10%-orange gradient let alerts scrolling underneath show through the title. */}
        <div className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-black/10 bg-white bg-gradient-to-r from-[#fff5e7] to-white px-5 py-4 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
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
          {subjectHourBudget && draft.subjectCode && !readOnly ? (
            <SubjectWeeklyHoursBanner
              requiredHours={subjectHourBudget.required}
              alreadyPlottedHours={subjectHourBudget.alreadyPlotted}
              additionalHours={additionalHours}
            />
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
                  /* Chairperson scope is one program; dropdown documents the active major. */
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
                value={lecLabModeValue}
                disabled={readOnly || !draft.subjectCode || !lecLabSelectable}
                onChange={(e) => {
                  const mode = e.target.value as PlotLecLabMode;
                  const base = subjectSelectValue || draft.subjectCode;
                  const subjectCode = resolveSubjectCodeForLecLabMode(
                    programCodeForSummary,
                    base,
                    mode,
                    catalogSubjectRows,
                  );
                  const p = rowForCode(subjectCode);
                  let startSlotIndex = draft.startSlotIndex;
                  if (p) {
                    const d = plotRowDurationSlots(p, draft);
                    startSlotIndex = clampPlotStartSlotIndex(startSlotIndex, d, slots);
                  }
                  setMeetings((prev) => ({
                    ...prev,
                    slots: prev.slots.map((s, i) => (i === 0 ? { ...s, durationHours: "1" } : s)),
                  }));
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
                  <option value={lecLabModeValue}>
                    {formatLecLabDisplay(lecLabModeValue)}
                  </option>
                )}
              </select>
              {durationSource ? (
                <p className="text-[10px] text-black/45 mt-0.5 tabular-nums">
                  {durationSource.lecUnits}u/{durationSource.lecHours}h lec · {durationSource.labUnits}u/
                  {durationSource.labHours}h lab
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="plot-section">
              Section
            </label>
            {/*
              Fixed: the section is chosen on the Subject Scheduler page (Department → Section) before
              the grid opens, and is never picked again here — plotting into another section from this
              window would put the class on a grid the person is not looking at.
            */}
            <div
              id="plot-section"
              role="textbox"
              aria-readonly="true"
              className="mt-1 flex w-full min-h-10 cursor-default items-center rounded-lg border border-black/15 bg-black/4 px-3 text-sm text-black/80"
            >
              {draft.sectionId
                ? (programSections.find((s) => s.id === draft.sectionId)?.name ?? "This section")
                : "Choose a section on the Subject Scheduler page first"}
            </div>
            <p className="text-[10px] text-black/45 mt-0.5">Set by the section chosen on the Subject Scheduler page.</p>
          </div>

          <div>
            <label className={labelClass} htmlFor="plot-instructor">
              Instructor
            </label>
            {/*
              A custom list rather than a native <select>: an <option> can hold only text, and a
              busy instructor needs a "View schedule" link beside their name. Busy instructors
              cannot be picked; choosing their row opens their Form 5A in a new tab, with the
              clashing class highlighted, so the plot being edited here is not lost.
            */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  id="plot-instructor"
                  type="button"
                  disabled={readOnly || noInstructors}
                  className={`${
                    missingInstructor && !readOnly ? incompleteField : `${fieldClass} mt-1`
                  } flex items-center justify-between gap-2 text-left disabled:opacity-60`}
                >
                  <span className={`truncate ${selectedInstructorOption ? "text-black" : "text-black/70"}`}>
                    {noInstructors
                      ? "No instructors available"
                      : selectedInstructorOption
                        ? formatInstructorPlotOptionLabel(selectedInstructorOption)
                        : "Select instructor…"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-black/50" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={4}
                className="z-[200] w-[var(--radix-dropdown-menu-trigger-width)] max-h-72 overflow-y-auto p-1"
              >
                <DropdownMenuItem
                  className="text-[13px] text-black/60"
                  onSelect={() => onDraftChange({ ...draft, instructorId: "" })}
                >
                  Select instructor…
                </DropdownMenuItem>
                {instructorPlotOptions.map((opt) => {
                  const busy = busyInstructorIds?.has(opt.id) === true && draft.instructorId !== opt.id;
                  const selected = draft.instructorId === opt.id;
                  const label = formatInstructorPlotOptionLabel(opt);
                  if (busy) {
                    const href = insFacultyScheduleHref({
                      basePath: insFormBasePath,
                      instructorId: opt.id,
                      highlightEntryId: busyInstructorIds?.get(opt.id),
                      periodId: academicPeriodId || periodIdFromLocation(),
                    });
                    return (
                      <DropdownMenuItem
                        key={opt.id}
                        className="flex items-center justify-between gap-3 text-[13px]"
                        onSelect={() => window.open(href, "_blank", "noopener,noreferrer")}
                      >
                        <span className="min-w-0 truncate text-black/45">
                          {label} <span className="text-[11px]">— Busy at this time</span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[#780301]">
                          View schedule
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </span>
                      </DropdownMenuItem>
                    );
                  }
                  return (
                    <DropdownMenuItem
                      key={opt.id}
                      className={`flex items-center justify-between gap-3 text-[13px] ${selected ? "font-semibold" : ""}`}
                      onSelect={() => onDraftChange({ ...draft, instructorId: opt.id })}
                    >
                      <span className="min-w-0 truncate">{label}</span>
                      {selected ? <Check className="h-4 w-4 shrink-0 text-[#780301]" aria-hidden /> : null}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            {noInstructors && !readOnly ? (
              <NoInstructorsNotice compact facultyProfileHref={facultyProfileHrefForInsBase(insFormBasePath)} />
            ) : null}
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

          <div>
            <label className={labelClass} htmlFor="plot-subject">
              Subject code
            </label>
            <select
              id="plot-subject"
              className={missingSubject && !readOnly ? incompleteField : `${fieldClass} mt-1`}
              value={subjectSelectValue}
              disabled={readOnly || !draft.sectionId || !draft.instructorId}
              onChange={(e) => {
                const picked = e.target.value;
                if (!picked) {
                  onDraftChange({
                    ...draft,
                    subjectCode: "",
                    lecLabMode: "lec",
                    students: "",
                  });
                  return;
                }
                const mode = inferLecLabMode(programCodeForSummary, picked, catalogSubjectRows);
                const subjectCode = resolveSubjectCodeForLecLabMode(
                  programCodeForSummary,
                  picked,
                  mode,
                  catalogSubjectRows,
                );
                const p = rowForCode(subjectCode);
                let startSlotIndex = draft.startSlotIndex;
                if (p) {
                  const d = plotRowDurationSlots(p, { durationSlots: 1 });
                  startSlotIndex = clampPlotStartSlotIndex(startSlotIndex, d, slots);
                }
                setMeetings((prev) => ({
                  ...prev,
                  slots: prev.slots.map((s, i) => (i === 0 ? { ...s, durationHours: "1" } : s)),
                }));
                onDraftChange({
                  ...draft,
                  subjectCode,
                  lecLabMode: mode,
                  startSlotIndex,
                  durationSlots: 1,
                  /*
                   * Each subject enrolls separately — irregular students are why this field moved
                   * off the section — so the figure is re-seeded for the subject now chosen rather
                   * than inherited from the one before it.
                   */
                  students: seedEnrollmentFor({ ...draft, subjectCode }),
                });
              }}
            >
              <option value="">
                {!draft.sectionId
                  ? "Select section first…"
                  : !draft.instructorId
                    ? "Select instructor first…"
                    : noSubjectsForSection
                    ? "No subjects for this section / term"
                    : "Select subject…"}
              </option>
              {availableSubjects.length > 0 ? (
                <optgroup label="Available">
                  {availableSubjects.map((s) => {
                    const done = fullyPlottedSubjects.get(normalizeProspectusCode(s.code));
                    return (
                      <option key={s.code} value={s.code} disabled={Boolean(done)}>
                        {formatPlotSubjectDropdownLabel(s)}
                        {done ? ` — Done plotting (${done.plotted}/${done.required} h)` : ""}
                      </option>
                    );
                  })}
                </optgroup>
              ) : null}
              {addAnotherSlotSubjects.length > 0 ? (
                <optgroup label="Add another time slot (same subject)">
                  {addAnotherSlotSubjects.map((s) => {
                    const done = fullyPlottedSubjects.get(normalizeProspectusCode(s.code));
                    return (
                      <option key={`split-${s.code}`} value={s.code} disabled={Boolean(done)}>
                        {done ? "" : "+ "}
                        {formatPlotSubjectDropdownLabel(s)}
                        {done ? ` — Done plotting (${done.plotted}/${done.required} h)` : ""}
                      </option>
                    );
                  })}
                </optgroup>
              ) : null}
              {draft.subjectCode &&
              !availableSubjects.some(
                (s) =>
                  normalizeProspectusCode(s.code) ===
                  normalizeProspectusCode(subjectSelectValue),
              ) ? (
                <option value={subjectSelectValue}>
                  {formatPlotSubjectDropdownLabel({
                    code: subjectSelectValue || draft.subjectCode,
                    title: durationSource?.title,
                  })}
                </option>
              ) : null}
            </select>
          </div>

          <PlotMeetingSlotsFields
            idPrefix="plot"
            draft={meetings}
            onChange={applyMeetingsChange}
            days={days}
            maxDur={maxDur}
            readOnly={readOnly}
            busyDays={busyDays}
            incomplete={(missingDay || missingTime) && !readOnly}
            error={meetingError}
          />

          <p className="text-[12px] font-medium text-black/60 rounded-lg bg-[#ff990a]/8 border border-[#ff990a]/25 px-3 py-2">
            Preview:{" "}
            {/* One line per day: each meeting has its own start and duration. */}
            {timeLine.split(" · ").map((line, i) => (
              <span key={`${line}-${i}`} className={`${i > 0 ? "block pl-[3.6rem]" : ""} text-black/85`}>
                {line}
              </span>
            ))}
            {draft.subjectCode && additionalHours > 0 ? (
              <span className="text-black/50">
                {" "}
                · {additionalHours} hour{additionalHours === 1 ? "" : "s"} total
              </span>
            ) : null}
          </p>
          {roomSuggestions.length > 0 ? (
            <div className="rounded-lg border border-[#ff990a]/30 bg-[#fff8ee] px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-black/75">
                <Sparkles className="h-3.5 w-3.5 text-[#e68a09]" aria-hidden />
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
                        picked
                          ? "border-[#780301] bg-[#780301] text-white"
                          : "border-black/15 bg-white text-black hover:border-[#ff990a]"
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
              rooms={roomsForEvaluatorGrid}
              buildingsCatalog={buildingsCatalog}
              busyRoomIds={busyRoomIds ?? undefined}
              onPick={(b, roomId) => {
                onBuildingChange(b);
                onDraftChange({ ...draft, roomId });
              }}
            />
          ) : null}

          {!readOnly && roomTakenNote && !draft.roomId ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
              {roomTakenNote} is occupied at this time, so it was cleared. Pick another room.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="plot-building">
              Building
            </label>
              <select
                id="plot-building"
                className={missingBuilding && !readOnly ? incompleteField : `${fieldClass} mt-1`}
                value={buildingValue}
                disabled={readOnly || noBuildings || !roomPickReady}
                onChange={(e) => {
                  const b = e.target.value;
                  onBuildingChange(b);
                  const keep =
                    draft.roomId &&
                    sortedRoomsInBuildingNamed(roomsForEvaluatorGrid, b, buildingsCatalog).some(
                      (r) => r.id === draft.roomId,
                    );
                  if (!keep) onDraftChange({ ...draft, roomId: "" });
                }}
              >
                <option value="">
                  {noBuildings ? "No buildings configured" : roomPickHint || "Select building…"}
                </option>
                {buildingLabelsForGrid.map((b) => {
                  const full = fullBuildings.has(b);
                  return (
                    <option key={b} value={b} disabled={full && buildingValue !== b}>
                      {plotBuildingOptionLabel(b, campusNavigationBuildingOptionLabel)}
                      {full ? " — No free room at this time" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="plot-room">
                Room
              </label>
              <select
                id="plot-room"
                className={missingRoom && !readOnly ? incompleteField : `${fieldClass} mt-1`}
                value={draft.roomId}
                disabled={readOnly || !buildingValue || !roomPickReady}
                onChange={(e) =>
                  onDraftChange({ ...draft, roomId: e.target.value })
                }
              >
                <option value="">
                  {roomPickHint || (buildingValue ? "Select room…" : "Select building first")}
                </option>
                {roomsInB.map((r) => {
                  const conflict = busyRoomIds?.has(r.id) === true;
                  return (
                    <option
                      key={r.id}
                      value={r.id}
                      disabled={conflict}
                    >
                      {formatRoomOptionLabel(r)}
                      {conflict ? " — Occupied" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {(() => {
            // Every problem with this plot, once: overlaps, free-time notices, server clashes.
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
                  ...serverConflicts,
                  ...freeTimeNotices,
                ]);
            if (issues.length > 0) {
              return (
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
              );
            }
            return serverChecking ? <p className="text-[11px] text-black/50">Checking for clashes…</p> : null;
          })()}

          <div>
            <label className={labelClass} htmlFor="plot-students">
              Students (enrollment)
            </label>
            <input
              id="plot-students"
              type="number"
              min={1}
              max={MAX_OFFERING_ENROLLMENT}
              required
              aria-describedby="plot-students-help"
              className={
                missingStudents && !readOnly ? incompleteField : `${fieldClass} mt-1 tabular-nums`
              }
              disabled={readOnly || missingSection || missingSubject}
              value={draft.students === "" ? "" : draft.students}
              onChange={(e) =>
                onDraftChange({ ...draft, students: parseEnrollmentInput(e.target.value) })
              }
              placeholder={
                missingSection
                  ? "Select section first"
                  : missingSubject
                    ? "Select subject first"
                    : "Required"
              }
            />
            <p id="plot-students-help" className="mt-1 text-[11px] leading-relaxed text-black/55">
              {offeringLabel
                ? `How many take ${offeringLabel} — count this subject, not the whole section, so irregular students are reflected. Every meeting of it uses this figure, and it prints as No. of Students on the INS forms.`
                : "Counted per subject, not per section, so irregular students are reflected. Every meeting of a subject uses the same figure, and it prints as No. of Students on the INS forms."}
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-end gap-2 border-t border-black/10 bg-white px-5 py-4">
          {plotIncomplete && !readOnly ? (
            <span className="mr-auto text-[11.5px] text-red-700">Complete the highlighted fields.</span>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold min-w-[120px]"
            disabled={
              readOnly || hasConflict || plotIncomplete || hoursOverLimit || serverChecking || serverConflicts.length > 0
            }
            onClick={handleApplyMeetings}
          >
            {isNewPlot ? "Plot schedule" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
