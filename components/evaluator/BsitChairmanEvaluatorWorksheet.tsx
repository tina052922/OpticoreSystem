"use client";

import { apiFetch, authApi, recordScheduleWrite } from "@/lib/api/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useSearchParams } from "next/navigation";
import { runCampusConflictScan } from "@/lib/scheduling/campus-conflict-scan-client";
import {
  detectConflictsSparse,
  scanAllSparseScheduleConflicts,
  scheduleEntryToSparseBlock,
} from "@/lib/scheduling/conflicts";
import type { SparseScheduleBlock } from "@/lib/scheduling/conflicts";
import { evaluateFacultyLoadsForCollege, rowNeedsTeachingLoadJustification, instructorMaxWeeklyTeachingCapFromProfile } from "@/lib/scheduling/facultyPolicies";
import type { GASuggestion, ScheduleBlock } from "@/lib/scheduling/types";
import { runRuleBasedGeneticAlgorithm } from "@/lib/scheduling/ruleBasedGA";
import { formatGaSuggestionShortLabel } from "@/lib/scheduling/conflict-suggestion-label";
import { slotDurationHours } from "@/lib/scheduling/time";
import type { FacultyProfile, Program, Room, ScheduleEntry, ScheduleLoadJustification, Section, Subject, User } from "@/types/db";
import { Button } from "@/components/ui/button";
import {
  normalizeScheduleEntryDayForEvaluator,
  normalizeSlotHHMM,
  startSlotIndexFromScheduleEntryStartTime,
} from "@/lib/chairman/evaluator-schedule-hydration";
import {
  BSIT_PROGRAM_CODE,
  normalizeProspectusCode,
} from "@/lib/chairman/bsit-prospectus";
import { BSENVS_PROGRAM_CODE, BSENVS_PROGRAM_ID } from "@/lib/chairman/bs-envsci-prospectus";
import {
  getProspectusSubjectsForProgram,
  prospectusRowForProgram,
  prospectusSubjectsForProgramYearAndSemester,
  prospectusSubjectsForProgramYearLevel,
} from "@/lib/chairman/prospectus-registry";
import { yearLevelFromSchedulingSectionName } from "@/lib/chairman/section-year-level";
import { prospectusSemesterFromAcademicPeriod } from "@/lib/academic-period-prospectus";
import {
  campusNavigationBuildingOptionLabel,
  sortedNavigationBuildingKeysFromRooms,
} from "@/lib/campus/campus-navigation-catalog";
import { dedupeLegacyItLabsForCampusNavigation } from "@/lib/campus/campus-navigation-room-dedupe";
import { filterRoomsForProgramPlot } from "@/lib/scheduling/program-plot-rooms";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import { useSystemConfigurationOptional } from "@/contexts/SystemConfigurationContext";
import { FACULTY_POLICY_CONSTANTS } from "@/lib/scheduling/constants";
import { BSIT_EVALUATOR_TIME_SLOTS, BSIT_EVALUATOR_WEEKDAYS, type BsitEvaluatorWeekday } from "@/lib/chairman/bsit-evaluator-constants";
import { evaluatorTimeSlots, evaluatorWeekdaysForMode, filterByProgramMode, isEvaluatorSlotPlottable, resolveProgramMode } from "@/lib/scheduling/program-mode";
import type { ProgramMode } from "@/lib/scheduling/program-mode";
import { useProgramMode } from "@/contexts/ProgramModeContext";
import { ProgramModeToggle } from "@/components/scheduling/ProgramModeToggle";
import { readEvaluatorBackupSnapshot, writeEvaluatorSessionSnapshot } from "@/lib/opticore-evaluator-session-sync";
import type { ChairmanPolicySnapshot } from "@/components/evaluator/ChairmanEvaluatorLoadPanel";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";
import { useScheduleEntryCrossReload } from "@/hooks/use-schedule-entry-cross-reload";
import { useOpticoreToast } from "@/components/alerts/OpticoreToastProvider";
import { ChairmanProgramProspectusSummaryTable } from "@/components/evaluator/ChairmanProgramProspectusSummaryTable";
import { EnrichedConflictIssuesPanel } from "@/components/campus-intelligence/EnrichedConflictIssuesPanel";
import { PolicyJustificationModal } from "@/components/evaluator/PolicyJustificationModal";
import { PolicyViolationFaq } from "@/components/evaluator/PolicyViolationFaq";
import type { EnrichedCampusIssue } from "@/lib/scheduling/conflict-enrichment";
import { formatTimeRange } from "@/lib/evaluator/schedule-evaluator-table";
import {
  formatInstructorPlotOptionLabel,
  formatUserInstructorLabel,
  mergeLegacyRowInstructorsIntoPlotOptions,
  usersToInstructorPlotOptions,
  type InstructorPlotOption,
} from "@/lib/evaluator/instructor-employee-id";
import {
  formatRoomOptionLabel,
  roomBuildingKey,
  roomsInBuildingSorted,
} from "@/lib/evaluator/room-by-building";

/** Fallback program code when session has no `chairmanProgramCode` (legacy chairman session). */
const DEFAULT_CHAIRMAN_PROGRAM_CODE: string = BSIT_PROGRAM_CODE;

const selectClass =
  "w-full min-h-10 rounded-md border border-black/25 bg-white px-2 text-[11px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";

/**
 * Day picker matches other grid selects (11px) so the row reads evenly; ring/border stay visible without upsizing type.
 */
const daySelectClass =
  "w-full min-h-10 min-w-0 rounded-md border border-black/25 bg-white px-2 text-[11px] font-medium text-neutral-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";

import type { PlotRow } from "@/lib/evaluator/chairman-plot-row";
import { plotRowDurationSlots } from "@/lib/evaluator/plot-duration";
import { formatSparseConflictLines } from "@/lib/evaluator/plot-conflict-messages";
import { emptyPlotRow, normalizePlotRow } from "@/lib/evaluator/chairman-plot-row";
import { BsitChairmanInteractiveWeekGrid } from "@/components/evaluator/BsitChairmanInteractiveWeekGrid";

export type { PlotRow } from "@/lib/evaluator/chairman-plot-row";

/** Plot fields merged from the grid; must win over stale DB refetches until save (see `locallyEditedRowIdsRef`). */
const LOCAL_EDIT_PLOT_KEYS: (keyof PlotRow)[] = [
  "day",
  "startSlotIndex",
  "sectionId",
  "subjectCode",
  "lecLabMode",
  "instructorId",
  "roomId",
  "students",
];


/** Build a Subject-shaped object for faculty policy evaluation from the active program prospectus. */
function subjectFromProspectus(code: string, programId: string, programCodeForSummary: string): Subject | undefined {
  const p = prospectusRowForProgram(programCodeForSummary, code);
  if (!p) return undefined;
  return {
    id: `prospectus-${p.code}`,
    code: p.code,
    subcode: null,
    title: p.title,
    lecUnits: p.lecUnits,
    lecHours: p.lecHours,
    labUnits: p.labUnits,
    labHours: p.labHours,
    programId,
    yearLevel: p.yearLevel,
  };
}

function rowTimeBounds(
  row: PlotRow,
  programCodeForSummary: string,
  slots: { label: string; startTime: string; endTime: string }[] = BSIT_EVALUATOR_TIME_SLOTS,
): { startIdx: number; start: (typeof slots)[0]; endSlot: (typeof slots)[0] } | null {
  if (row.startSlotIndex < 0) return null;
  const p = row.subjectCode ? prospectusRowForProgram(programCodeForSummary, row.subjectCode) : undefined;
  if (!p) return null;
  const dur = plotRowDurationSlots(p, row);
  const maxS = slots.length - dur;
  const startIdx = Math.min(row.startSlotIndex, maxS);
  const start = slots[startIdx];
  const endIdx = startIdx + dur - 1;
  const endSlot = slots[endIdx];
  if (!start || !endSlot || startIdx < 0 || endIdx >= slots.length) return null;
  return { startIdx, start, endSlot };
}

/** Subject + day + start → interval; resources optional (for real-time conflict checks). */
function rowToSparseBlock(
  row: PlotRow,
  academicPeriodId: string,
  programCodeForSummary: string,
  programMode: ProgramMode = "day",
  slots: { label: string; startTime: string; endTime: string }[] = BSIT_EVALUATOR_TIME_SLOTS,
): SparseScheduleBlock | null {
  if (!academicPeriodId || !row.day) return null;
  const t = rowTimeBounds(row, programCodeForSummary, slots);
  if (!t) return null;
  return {
    id: row.id,
    academicPeriodId,
    day: row.day,
    startTime: t.start.startTime,
    endTime: t.endSlot.endTime,
    instructorId: row.instructorId || null,
    sectionId: row.sectionId || null,
    roomId: row.roomId || null,
    programMode,
  };
}

function rowToBlock(
  row: PlotRow,
  academicPeriodId: string,
  subjectIdForRow: string,
  programCodeForSummary: string,
  programMode: ProgramMode = "day",
  slots: { label: string; startTime: string; endTime: string }[] = BSIT_EVALUATOR_TIME_SLOTS,
): ScheduleBlock | null {
  if (!row.sectionId || !row.instructorId || !row.roomId || !row.subjectCode) return null;
  const p = prospectusRowForProgram(programCodeForSummary, row.subjectCode);
  if (!p) return null;
  const t = rowTimeBounds(row, programCodeForSummary, slots);
  if (!t) return null;
  return {
    id: row.id,
    academicPeriodId,
    subjectId: subjectIdForRow,
    instructorId: row.instructorId,
    sectionId: row.sectionId,
    roomId: row.roomId,
    day: row.day,
    startTime: t.start.startTime,
    endTime: t.endSlot.endTime,
    programMode,
  };
}

/** Campus-wide policy merge: persisted term rows + worksheet overlay (same rules as the `mergedEntriesForCollegePolicy` memo). */
function buildWorksheetPolicyScheduleEntries(args: {
  rows: PlotRow[];
  allTermScheduleEntries: ScheduleEntry[];
  academicPeriodId: string;
  programId: string;
  programCodeForSummary: string;
  programMode: ProgramMode;
  slots: { label: string; startTime: string; endTime: string }[];
}): ScheduleEntry[] {
  const { rows, allTermScheduleEntries, academicPeriodId, programId, programCodeForSummary, programMode, slots } = args;
  const worksheetIds = new Set(rows.map((r) => r.id));
  const byId = new Map<string, ScheduleEntry>();

  for (const e of allTermScheduleEntries) {
    if (e.academicPeriodId !== academicPeriodId) continue;
    if (worksheetIds.has(e.id)) continue;
    byId.set(e.id, e);
  }

  for (const row of rows) {
    let entry: ScheduleEntry | null = null;
    const subj = row.subjectCode ? subjectFromProspectus(row.subjectCode, programId, programCodeForSummary) : undefined;
    if (subj) {
      const b = rowToBlock(row, academicPeriodId, subj.id, programCodeForSummary, programMode, slots);
      if (b) {
        entry = {
          id: row.id,
          academicPeriodId,
          subjectId: subj.id,
          instructorId: row.instructorId,
          sectionId: row.sectionId,
          roomId: row.roomId,
          day: row.day,
          startTime: b.startTime,
          endTime: b.endTime,
          status: "draft",
          programMode,
        };
      }
    }
    if (!entry) {
      const fromDb = allTermScheduleEntries.find((e) => e.id === row.id);
      if (fromDb && fromDb.academicPeriodId === academicPeriodId) entry = fromDb;
    }
    if (entry) byId.set(row.id, entry);
  }

  return [...byId.values()];
}

/** Normalize DB time strings for sparse overlap checks (matches GEC `GecSectionPlottingTable`). */
function hhmmSchedule(t: string): string {
  const s = t.trim();
  return s.length > 5 ? s.slice(0, 5) : s;
}

function scheduleEntryToBlock(e: ScheduleEntry): ScheduleBlock | null {
  if (!e.instructorId || !e.sectionId || !e.roomId) return null;
  return {
    id: e.id,
    academicPeriodId: e.academicPeriodId,
    subjectId: e.subjectId,
    instructorId: e.instructorId,
    sectionId: e.sectionId,
    roomId: e.roomId,
    day: e.day,
    startTime: hhmmSchedule(e.startTime),
    endTime: hhmmSchedule(e.endTime),
    programMode: resolveProgramMode(e),
  };
}

/** INS-style labels: full range line + each 1-hour row (matches Schedule Preview). */
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

type BsitChairmanEvaluatorWorksheetProps = {
  chairmanCollegeId: string | null;
  chairmanProgramId: string | null;
  /** Static prospectus / summary label (e.g. BSIT) — mirrors `getChairmanSession().programCode`. */
  chairmanProgramCode?: string | null;
  chairmanProgramName?: string | null;
  /** Live load summary for the Evaluator &quot;Hrs-Units-Preps-Remarks&quot; tab. */
  onPolicySnapshot?: (snapshot: ChairmanPolicySnapshot | null) => void;
};

function rowFullyPlotted(row: PlotRow, programCodeForSummary: string): boolean {
  if (!row.sectionId || !row.subjectCode || !row.instructorId || !row.roomId) return false;
  return rowTimeBounds(row, programCodeForSummary) != null;
}

/**
 * Same bar as {@link BsitWeekPreview}: a class appears in the weekly grid when section, prospectus subject, day, and
 * start slot are set. Instructor/room are optional for rendering the cell — the summary “Plotted” badge must follow
 * this so it stays in sync with the preview (autosave to DB may still wait for full resource fields).
 */
function rowVisibleInSchedulePreview(row: PlotRow, programCodeForSummary: string): boolean {
  if (!row.sectionId || !row.subjectCode) return false;
  if (!prospectusRowForProgram(programCodeForSummary, row.subjectCode)) return false;
  return rowTimeBounds(row, programCodeForSummary) != null;
}

export function BsitChairmanEvaluatorWorksheet({
  chairmanCollegeId,
  chairmanProgramId,
  chairmanProgramCode = null,
  chairmanProgramName = null,
  onPolicySnapshot,
}: BsitChairmanEvaluatorWorksheetProps) {
  const toast = useOpticoreToast();
  const searchParams = useSearchParams();
  const { selectedPeriodId: academicPeriodId, selectedPeriod } = useSemesterFilter();
  const { programMode } = useProgramMode();
  const slotsForMode = evaluatorTimeSlots(programMode);
  const systemConfig = useSystemConfigurationOptional();
  const policyConstants = systemConfig?.policyConstants ?? FACULTY_POLICY_CONSTANTS;
  const maxFacultyHours = systemConfig?.defaultMaxFacultyHoursPerWeek;
  const [sections, setSections] = useState<Section[]>([]);
  const [programsCatalog, setProgramsCatalog] = useState<Pick<Program, "id" | "collegeId">[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [dbInstructors, setDbInstructors] = useState<User[]>([]);
  const [facultyProfiles, setFacultyProfiles] = useState<FacultyProfile[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Full term load for campus-wide conflict checks (every program — merged with worksheet state). */
  const [allTermScheduleEntries, setAllTermScheduleEntries] = useState<ScheduleEntry[]>([]);
  /** Row ids flagged by explicit &quot;Run conflict check&quot; (full campus scan). */
  const [campusScanConflictIds, setCampusScanConflictIds] = useState<Set<string>>(() => new Set());
  const [saveScheduleBusy, setSaveScheduleBusy] = useState(false);
  const [saveScheduleMsg, setSaveScheduleMsg] = useState<string | null>(null);
  /** Server-enriched explanations (saved DB rows); local unsaved edits may add conflicts not listed here. */
  const [chairmanEnrichedIssues, setChairmanEnrichedIssues] = useState<EnrichedCampusIssue[]>([]);
  const [chairmanGaByIssueKey, setChairmanGaByIssueKey] = useState<Record<string, GASuggestion[]>>({});
  const [busyChairmanApplyKey, setBusyChairmanApplyKey] = useState<string | null>(null);
  const [conflictDetailLoading, setConflictDetailLoading] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutosaveToastAtRef = useRef<number>(0);
  /** When offline, autosave is deferred; we flush once connection is restored. */
  const lastOfflineEditAtRef = useRef<number>(0);
  /** Shown in the grid header so testers see autosave + connectivity without opening the console. */
  const [connOnline, setConnOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [lastDraftSaveAt, setLastDraftSaveAt] = useState<Date | null>(null);
  /** Dedupe real-time conflict toasts per row + conflict signature. */
  const lastConflictToastRef = useRef<Map<string, string>>(new Map());

  const [dayRows, setDayRows] = useState<PlotRow[]>([]);
  const [nightRows, setNightRows] = useState<PlotRow[]>([]);
  const rows = programMode === "night" ? nightRows : dayRows;
  const setRows = programMode === "night" ? setNightRows : setDayRows;
  const [justificationText, setJustificationText] = useState("");
  const [justificationSaving, setJustificationSaving] = useState(false);
  const [justificationMsg, setJustificationMsg] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  /** Brief highlight in the prospectus summary when a new subject is plotted for the selected section. */
  const [lastPlottedSubjectFlash, setLastPlottedSubjectFlash] = useState<string | null>(null);
  const plottedSnapshotRef = useRef<string>("");
  const [policyJustificationModalOpen, setPolicyJustificationModalOpen] = useState(false);
  /** Distinguish save-time vs in-grid assignment gate when load policy requires VPAA justification. */
  const [policyModalReason, setPolicyModalReason] = useState<"save" | "assign">("save");
  /**
   * After upsert, same-tab `dispatchInsCatalogReload` + Realtime can return stale `ScheduleEntry` rows for many
   * seconds. Prefer the in-memory grid for recently saved ids until `locallyEditedRowIdsRef` clears via a matching fetch.
   */
  const postPersistUiMergeRef = useRef<{ until: number; ids: Set<string> } | null>(null);
  /**
   * Row ids with plot edits that must win over refetched `ScheduleEntry` rows until the fetch matches the grid
   * (same day/slot/section/instructor/room/subject). Do **not** clear this on upsert success: `dispatchInsCatalogReload`
   * triggers an immediate reload that often returns read-your-writes stale times; clearing here caused saves to “revert”.
   */
  const locallyEditedRowIdsRef = useRef<Set<string>>(new Set());
  /** Plot row waiting for VPAA justification before applying instructor/day/slot overload. */
  const policyAssignGateRef = useRef<PlotRow | null>(null);
  /**
   * Two-step Building → Room UX (not persisted — `ScheduleEntry` still stores `roomId` only).
   * Room list per building is filtered/sorted with {@link roomsInBuildingSorted} so it matches campus navigation towers.
   */
  const [roomBuildingByRowId, setRoomBuildingByRowId] = useState<Record<string, string>>({});
  const lastSyncedByModeRef = useRef<{ day: Set<string>; night: Set<string> }>({
    day: new Set(),
    night: new Set(),
  });
  /** IDs loaded with `lockedByDoiAt` — never send DELETE for these if they disappear from state (e.g. scope change). */
  const lockedEntryIdsRef = useRef<Set<string>>(new Set());
  const didHydrateFromDbRef = useRef(false);

  /** Prospectus registry key — aligns with `Program.code` in Supabase (e.g. BSIT, BSENVS). */
  const programCodeForSummary = (chairmanProgramCode ?? "").trim() || DEFAULT_CHAIRMAN_PROGRAM_CODE;
  const programId =
    chairmanProgramId ??
    (programCodeForSummary.toUpperCase() === BSENVS_PROGRAM_CODE.toUpperCase() ? BSENVS_PROGRAM_ID : "prog-bsit");



  /**
   * Load saved VPAA justification text only when term/college scope changes — not on every schedule refetch
   * (Realtime / cross-reload), and never while the policy modal is open, so typing is not overwritten.
   */
  const justificationHydrateKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (policyJustificationModalOpen) return;
    if (!chairmanCollegeId || !academicPeriodId) {
      justificationHydrateKeyRef.current = null;
      setJustificationText("");
      return;
    }
    const key = `${academicPeriodId}|${chairmanCollegeId}`;
    if (justificationHydrateKeyRef.current === key) return;
    justificationHydrateKeyRef.current = key;
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch<{ justifications: ScheduleLoadJustification[] }>(
          `/api/catalog/schedule-load-justifications?academicPeriodId=${academicPeriodId}&collegeId=${chairmanCollegeId}`,
          { method: "GET" },
        );
        if (!cancelled) {
          const lj = (data.justifications ?? [])[0] as ScheduleLoadJustification | undefined;
          setJustificationText(lj?.justification ?? "");
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [academicPeriodId, chairmanCollegeId, policyJustificationModalOpen]);

  /**
   * All sections for this chairman program (plotting grid only). Policy load + INS use campus-wide `ScheduleEntry`
   * rows visible under RLS; INS 5B/5C pickers use `insResourceEntries` (not a college-only slice).
   */
  const programSections = useMemo(
    () => sections.filter((s) => s.programId === programId).sort((a, b) => a.name.localeCompare(b.name)),
    [sections, programId],
  );

  const programSectionIdSet = useMemo(
    () => new Set(programSections.map((s) => s.id)),
    [programSections],
  );

  const programCollegeByProgramId = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const p of programsCatalog) {
      m.set(p.id, p.collegeId ?? null);
    }
    return m;
  }, [programsCatalog]);

  /** Maps section → college for load policy (shared faculty teach across programs in one college). */
  const sectionToCollegeId = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const s of sections) {
      m.set(s.id, programCollegeByProgramId.get(s.programId) ?? null);
    }
    return (sectionId: string) => m.get(sectionId) ?? null;
  }, [sections, programCollegeByProgramId]);

  /** All catalog subjects — policy lec/lab split must see BIT/BSIT/etc. rows, not only chairman prospectus ids. */
  const subjectByIdForPolicy = useMemo(() => {
    const m = new Map<string, Subject>();
    for (const s of subjects) m.set(s.id, s);
    return m;
  }, [subjects]);

  /**
   * Subject code → Subject.id mapping.
   *
   * Production data can have programId mismatches (chairmanProgramId vs the actual Subject.programId used in seed).
   * To prevent “Save schedule” from skipping rows, we keep:
   * - a preferred map scoped to the chairman program (when set)
   * - a global fallback map across all subjects
   */
  const subjectIdByCode = useMemo(() => {
    const scoped = new Map<string, string>();
    const global = new Map<string, string>();
    for (const s of subjects) {
      global.set(normalizeProspectusCode(s.code), s.id);
      if (chairmanProgramId && s.programId !== chairmanProgramId) continue;
      scoped.set(normalizeProspectusCode(s.code), s.id);
    }
    return { scoped, global };
  }, [subjects, chairmanProgramId]);

  const subjectCodeById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of subjects) {
      m.set(s.id, s.code);
    }
    return m;
  }, [subjects]);

  const lastFetchAtRef = useRef(0);
  const staticLoadedForPeriodRef = useRef<string | null>(null);

  const loadAllData = useCallback(async () => {
    if (!academicPeriodId) return;

    const now = Date.now();
    if (lastFetchAtRef.current > 0 && now - lastFetchAtRef.current < 3000) {
      return;
    }
    lastFetchAtRef.current = now;

    setLoadError(null);

    let entries: ScheduleEntry[] = [];
    let bundleSections: Section[] = [];
    let bundleSubjects: Subject[] = [];
    try {
      const bundle = await apiFetch<any>(
        `/api/catalog/evaluator-bundle?academicPeriodId=${academicPeriodId}`,
        { method: "GET" },
      );

      bundleSections = (bundle.sections ?? []) as Section[];
      bundleSubjects = (bundle.subjects ?? []) as Subject[];

      if (staticLoadedForPeriodRef.current !== academicPeriodId) {
        setSections(bundleSections);
        setProgramsCatalog(bundle.programs?.map((p: any) => ({ id: p.id, collegeId: p.collegeId })) ?? []);
        setSubjects(bundleSubjects);
        setRooms(bundle.rooms ?? []);
        staticLoadedForPeriodRef.current = academicPeriodId;
      }

      entries = (bundle.entries ?? []) as ScheduleEntry[];
      setAllTermScheduleEntries(entries);

      const allUsers = (bundle.users ?? []) as User[];
      const campusFac = allUsers.filter(
        (u) =>
          (u.role === "instructor" || u.role === "chairman_admin") &&
          (!chairmanCollegeId || u.collegeId === chairmanCollegeId),
      );
      const instrIds = [...new Set(entries.map((e) => e.instructorId).filter(Boolean))] as string[];
      const rowFac = allUsers.filter(
        (u) => instrIds.includes(u.id) && (u.role === "instructor" || u.role === "chairman_admin"),
      );
      const mergedFac = [...new Map([...campusFac, ...rowFac].map((u) => [u.id, u])).values()];
      setDbInstructors(mergedFac.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")));
      setFacultyProfiles((bundle.facultyProfiles ?? []) as FacultyProfile[]);
    } catch {
      setLoadError("Failed to load catalog");
      lastFetchAtRef.current = 0;
      return;
    }

    const localSectionIdSet = new Set(
      bundleSections.filter((s) => s.programId === programId).map((s) => s.id),
    );
    const localCodeById = new Map(bundleSubjects.map((s) => [s.id, s.code]));

    const relevant =
      localSectionIdSet.size === 0
        ? []
        : entries.filter((e) => localSectionIdSet.has(e.sectionId));

    lockedEntryIdsRef.current = new Set(
      relevant.filter((e) => Boolean(e.lockedByDoiAt)).map((e) => e.id),
    );

    const mapToPlotRows = (list: ScheduleEntry[], mode: ProgramMode): PlotRow[] => {
      const slots = evaluatorTimeSlots(mode);
      const slotIndexByStartTime = new Map<string, number>();
      for (let i = 0; i < slots.length; i++) {
        const t = slots[i];
        if (t) {
          slotIndexByStartTime.set(t.startTime, i);
          slotIndexByStartTime.set(normalizeSlotHHMM(t.startTime), i);
        }
      }
      return list.map((e) => {
        const normStart = normalizeSlotHHMM(e.startTime);
        const slotIdx =
          slotIndexByStartTime.get(normStart) ??
          slotIndexByStartTime.get(e.startTime) ??
          startSlotIndexFromScheduleEntryStartTime(e.startTime, mode);
        const subjectCode = localCodeById.get(e.subjectId) ?? "";
        return normalizePlotRow(
          {
            id: e.id,
            sectionId: e.sectionId,
            students: "",
            subjectCode,
            lecLabMode: "lec",
            instructorId: e.instructorId,
            roomId: e.roomId,
            startSlotIndex: slotIdx,
            day: normalizeScheduleEntryDayForEvaluator(e.day),
            lockedByDoiAt: e.lockedByDoiAt ?? null,
          },
          programCodeForSummary,
        );
      });
    };

    const mergeHydrate = (prev: PlotRow[], nextRows: PlotRow[]): PlotRow[] => {
      const dbIds = new Set(nextRows.map((r) => r.id));
      const pending = prev.filter((r) => !dbIds.has(r.id) && !r.lockedByDoiAt);
      const guard = postPersistUiMergeRef.current;
      const now = Date.now();
      const mergedDb = nextRows.map((nr) => {
        const local = prev.find((p) => p.id === nr.id);
        if (local && !local.lockedByDoiAt && locallyEditedRowIdsRef.current.has(nr.id)) {
          const samePlot =
            normalizeScheduleEntryDayForEvaluator(local.day) === normalizeScheduleEntryDayForEvaluator(nr.day) &&
            local.startSlotIndex === nr.startSlotIndex &&
            local.sectionId === nr.sectionId &&
            local.roomId === nr.roomId &&
            local.instructorId === nr.instructorId &&
            local.subjectCode === nr.subjectCode &&
            (local.lecLabMode ?? "lec") === (nr.lecLabMode ?? "lec");
          if (samePlot) {
            locallyEditedRowIdsRef.current.delete(nr.id);
            return nr;
          }
          return {
            ...nr,
            day: local.day,
            startSlotIndex: local.startSlotIndex,
            sectionId: local.sectionId,
            subjectCode: local.subjectCode,
            lecLabMode: local.lecLabMode,
            instructorId: local.instructorId,
            roomId: local.roomId,
            students: local.students,
          };
        }
        if (guard && now < guard.until && guard.ids.has(nr.id)) {
          const localG = prev.find((p) => p.id === nr.id);
          if (localG && !localG.lockedByDoiAt) {
            return {
              ...nr,
              day: localG.day,
              startSlotIndex: localG.startSlotIndex,
              sectionId: localG.sectionId,
              subjectCode: localG.subjectCode,
              lecLabMode: localG.lecLabMode,
              instructorId: localG.instructorId,
              roomId: localG.roomId,
              students: localG.students,
            };
          }
        }
        return nr;
      });
      return [...mergedDb, ...pending];
    };

    const dayNext = mapToPlotRows(filterByProgramMode(relevant, "day"), "day");
    const nightNext = mapToPlotRows(filterByProgramMode(relevant, "night"), "night");

    didHydrateFromDbRef.current = true;
    lastSyncedByModeRef.current.day = new Set(dayNext.map((r) => r.id));
    lastSyncedByModeRef.current.night = new Set(nightNext.map((r) => r.id));
    setDayRows((prev) => mergeHydrate(prev, dayNext));
    setNightRows((prev) => mergeHydrate(prev, nightNext));
  }, [chairmanCollegeId, academicPeriodId, programCodeForSummary]);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  /** Program-scoped plot rooms (BSIT → official IT labs only). Legacy IT LAB rows deduped when COTE labs load. */
  const roomsForEvaluatorGrid = useMemo((): Room[] => {
    const catalog = dedupeLegacyItLabsForCampusNavigation(rooms);
    const scoped = filterRoomsForProgramPlot(catalog, programCodeForSummary, chairmanCollegeId);
    const sorted = [...scoped].sort((a, b) => {
      const ba = (a.building ?? "").localeCompare(b.building ?? "");
      if (ba !== 0) return ba;
      return a.code.localeCompare(b.code);
    });
    return sorted.length > 0 ? sorted : rooms;
  }, [rooms, chairmanCollegeId, programCodeForSummary]);

  const rowInstructorIds = useMemo(() => rows.map((r) => r.instructorId).filter(Boolean) as string[], [rows]);

  const facultyProfileByUserId = useMemo(() => {
    const m = new Map<string, FacultyProfile>();
    for (const p of facultyProfiles) m.set(p.userId, p);
    return m;
  }, [facultyProfiles]);

  const instructorPlotOptions = useMemo((): InstructorPlotOption[] => {
    const base = usersToInstructorPlotOptions(dbInstructors, facultyProfileByUserId);
    return mergeLegacyRowInstructorsIntoPlotOptions(base, dbInstructors, rowInstructorIds, facultyProfileByUserId);
  }, [dbInstructors, rowInstructorIds, facultyProfileByUserId]);

  /** Week preview / conflict UI: full name (Faculty Profile when set). */
  const instructorDisplayById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of dbInstructors) {
      m.set(u.id, formatUserInstructorLabel(u, facultyProfileByUserId.get(u.id)));
    }
    return m;
  }, [dbInstructors, facultyProfileByUserId]);

  const userById = useMemo(() => {
    const m = new Map<string, User>();
    dbInstructors.forEach((u) => m.set(u.id, u));
    return m;
  }, [dbInstructors]);

  const roomById = useMemo(() => {
    const m = new Map<string, Room>();
    for (const r of rooms) m.set(r.id, r);
    for (const r of roomsForEvaluatorGrid) m.set(r.id, r);
    return m;
  }, [rooms, roomsForEvaluatorGrid]);

  const buildingLabelsForGrid = useMemo(
    () => sortedNavigationBuildingKeysFromRooms(roomsForEvaluatorGrid),
    [roomsForEvaluatorGrid],
  );

  const sectionNameById = useMemo(() => {
    const m = new Map<string, string>();
    programSections.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [programSections]);

  /**
   * Prospectus summary: year level from section name (BSIT-3A → 3). `undefined` = no section; `null` = unparseable.
   */
  const summaryYearLevelFilter = useMemo((): number | null | undefined => {
    if (!selectedSectionId) return undefined;
    const name = sectionNameById.get(selectedSectionId) ?? "";
    return yearLevelFromSchedulingSectionName(name);
  }, [selectedSectionId, sectionNameById]);

  /** Align plotted subjects with the global term: prospectus semester 1 vs 2 from `AcademicPeriod` naming. */
  const termProspectusSemester = useMemo(
    () => prospectusSemesterFromAcademicPeriod(selectedPeriod),
    [selectedPeriod],
  );

  /** Any row published for this term — RLS blocks chairman mutations; worksheet stays read-only. */
  const schedulePublished = useMemo(() => rows.some((r) => Boolean(r.lockedByDoiAt)), [rows]);

  /**
   * Evaluator grid behavior: when the user selects a section, show only that section's rows.
   * This prevents "carry-over" confusion where previously plotted rows from other sections remain visible.
   */
  const roomCodeById = useMemo(() => {
    const m = new Map<string, string>();
    roomsForEvaluatorGrid.forEach((r) => m.set(r.id, r.displayName?.trim() ? `${r.code} — ${r.displayName}` : r.code));
    return m;
  }, [roomsForEvaluatorGrid]);

  const majorOptions = useMemo(
    () => [
      {
        value: programCodeForSummary,
        label: chairmanProgramName?.trim()
          ? `${programCodeForSummary} — ${chairmanProgramName.trim()}`
          : programCodeForSummary,
      },
    ],
    [programCodeForSummary, chairmanProgramName],
  );

  const subjectById = useMemo(() => {
    const m = new Map<string, Subject>();
    for (const p of getProspectusSubjectsForProgram(programCodeForSummary)) {
      const sub = subjectFromProspectus(p.code, programId, programCodeForSummary);
      if (sub) m.set(sub.id, sub);
    }
    return m;
  }, [programId, programCodeForSummary]);

  const profileByUserId = useMemo(() => {
    const m = new Map<string, FacultyProfile>();
    facultyProfiles.forEach((p) => m.set(p.userId, p));
    return m;
  }, [facultyProfiles]);

  /**
   * Subject codes that appear in the schedule preview for the selected section — drives the prospectus “Plotted”
   * column (must match {@link BsitWeekPreview} / {@link rowVisibleInSchedulePreview}, not DB-only “fully saved” rows).
   */
  const plottedSubjectCodesForSection = useMemo(() => {
    const set = new Set<string>();
    if (!selectedSectionId) return set;
    for (const row of rows) {
      if (row.sectionId !== selectedSectionId) continue;
      if (!rowVisibleInSchedulePreview(row, programCodeForSummary)) continue;
      set.add(normalizeProspectusCode(row.subjectCode));
    }
    return set;
  }, [rows, selectedSectionId, programCodeForSummary]);

  /**
   * Per-section plotted codes (DB + worksheet). Used to keep subject dropdowns clear:
   * - show remaining (unplotted) subjects as selectable
   * - keep already scheduled ones visible but grouped/disabled (prevents accidental duplicates)
   */
  const plottedCodesBySectionId = useMemo(() => {
    const m = new Map<string, Set<string>>();
    const add = (sectionId: string, code: string) => {
      if (!sectionId || !code) return;
      const key = sectionId.trim();
      if (!key) return;
      const c = normalizeProspectusCode(code);
      if (!c) return;
      const set = m.get(key) ?? new Set<string>();
      set.add(c);
      m.set(key, set);
    };

    for (const e of allTermScheduleEntries) {
      if (academicPeriodId && e.academicPeriodId !== academicPeriodId) continue;
      if (resolveProgramMode(e) !== programMode) continue;
      if (!programSectionIdSet.has(e.sectionId)) continue;
      const code = subjectCodeById.get(e.subjectId) ?? "";
      if (code) add(e.sectionId, code);
    }
    for (const r of rows) {
      const p = r.subjectCode ? prospectusRowForProgram(programCodeForSummary, r.subjectCode) : undefined;
      if (!r.sectionId || !r.subjectCode || !p) continue;
      add(r.sectionId, r.subjectCode);
    }
    return m;
  }, [allTermScheduleEntries, academicPeriodId, programSectionIdSet, rows, subjectCodeById, programCodeForSummary]);

  /**
   * Full `ScheduleBlock` set for the term: DB snapshot + worksheet overlay. Drives the explicit
   * &quot;Run conflict check&quot; (campus-wide — same model as GEC Central Hub).
   */
  const mergedBlocksForCampusScan = useMemo(() => {
    if (!academicPeriodId) return [] as ScheduleBlock[];
    const worksheetIds = new Set(rows.map((r) => r.id));
    const byId = new Map<string, ScheduleBlock>();
    for (const e of allTermScheduleEntries) {
      if (e.academicPeriodId !== academicPeriodId) continue;
      if (resolveProgramMode(e) !== programMode) continue;
      if (worksheetIds.has(e.id)) continue;
      const b = scheduleEntryToBlock(e);
      if (b) byId.set(e.id, b);
    }
    for (const row of rows) {
      const subj = row.subjectCode ? subjectFromProspectus(row.subjectCode, programId, programCodeForSummary) : undefined;
      let b: ScheduleBlock | null = subj
        ? rowToBlock(row, academicPeriodId, subj.id, programCodeForSummary, programMode, slotsForMode)
        : null;
      if (!b) {
        const fromDb = allTermScheduleEntries.find((e) => e.id === row.id);
        if (fromDb && fromDb.academicPeriodId === academicPeriodId) b = scheduleEntryToBlock(fromDb);
      }
      if (b) byId.set(row.id, b);
    }
    return [...byId.values()];
  }, [allTermScheduleEntries, academicPeriodId, rows, programId, programCodeForSummary, programMode, slotsForMode]);

  /**
   * Campus-wide sparse blocks: every term `ScheduleEntry` (partial rows included) + worksheet overlay.
   * Using only “complete” plot blocks dropped valid faculty/room overlaps when room/instructor was missing on save.
   */
  const sparseCampusUniverse = useMemo((): SparseScheduleBlock[] => {
    if (!academicPeriodId) return [];
    const worksheetIds = new Set(rows.map((r) => r.id));
    const byId = new Map<string, SparseScheduleBlock>();
    for (const e of allTermScheduleEntries) {
      if (e.academicPeriodId !== academicPeriodId) continue;
      if (resolveProgramMode(e) !== programMode) continue;
      if (worksheetIds.has(e.id)) continue;
      const b = scheduleEntryToSparseBlock(e);
      if (b) byId.set(e.id, b);
    }
    for (const row of rows) {
      const b = rowToSparseBlock(row, academicPeriodId, programCodeForSummary, programMode, slotsForMode);
      if (b) byId.set(row.id, b);
    }
    return [...byId.values()];
  }, [allTermScheduleEntries, academicPeriodId, rows, programCodeForSummary, programMode, slotsForMode]);

  const conflictForRow = useCallback(
    (row: PlotRow): { faculty: string; room: string; section: string } => {
      if (!academicPeriodId) return { faculty: "—", room: "—", section: "—" };
      const candidate = rowToSparseBlock(row, academicPeriodId, programCodeForSummary, programMode, slotsForMode);
      if (!candidate) return { faculty: "—", room: "—", section: "—" };
      const hits = detectConflictsSparse(candidate, sparseCampusUniverse, candidate.id);
      const fac = hits.some((h) => h.type === "faculty");
      const room = hits.some((h) => h.type === "room");
      const sec = hits.some((h) => h.type === "section");
      return {
        faculty: !candidate.instructorId ? "—" : fac ? "Yes" : "No",
        room: !candidate.roomId ? "—" : room ? "Yes" : "No",
        section: !candidate.sectionId ? "—" : sec ? "Yes" : "No",
      };
    },
    [academicPeriodId, sparseCampusUniverse, programCodeForSummary, programMode, slotsForMode],
  );

  const conflictDetailForRow = useCallback(
    (row: PlotRow): string[] => {
      if (!academicPeriodId) return [];
      const candidate = rowToSparseBlock(row, academicPeriodId, programCodeForSummary, programMode, slotsForMode);
      if (!candidate) return [];
      const hits = detectConflictsSparse(candidate, sparseCampusUniverse, candidate.id);
      return formatSparseConflictLines(hits, sparseCampusUniverse, {
        instructorName: row.instructorId ? instructorDisplayById.get(row.instructorId) : undefined,
        sectionName: row.sectionId ? sectionNameById.get(row.sectionId) : undefined,
        roomCode: row.roomId ? roomCodeById.get(row.roomId) : undefined,
        subjectCode: row.subjectCode,
        when: `${row.day} ${candidate.startTime.slice(0, 5)}–${candidate.endTime.slice(0, 5)}`,
      });
    },
    [
      academicPeriodId,
      sparseCampusUniverse,
      programCodeForSummary,
      instructorDisplayById,
      sectionNameById,
      roomCodeById,
    ],
  );

  const notifyRealtimeConflicts = useCallback(
    (row: PlotRow) => {
      const cf = conflictForRow(row);
      const sig = `${cf.faculty}|${cf.room}|${cf.section}`;
      const prev = lastConflictToastRef.current.get(row.id);
      if (prev === sig) return;
      lastConflictToastRef.current.set(row.id, sig);
      const hits: string[] = [];
      if (cf.faculty === "Yes") hits.push("Faculty conflict");
      if (cf.room === "Yes") hits.push("Room conflict");
      if (cf.section === "Yes") hits.push("Section conflict");
      if (hits.length === 0) return;
      const sectionLabel = row.sectionId ? (sectionNameById.get(row.sectionId) ?? "section") : "schedule";
      toast.error(hits.join(" · "), `Overlapping assignment detected for ${sectionLabel}. Adjust day, time, room, or instructor.`);
    },
    [conflictForRow, sectionNameById, toast],
  );

  const runCampusConflictCheck = useCallback(async () => {
    if (!academicPeriodId) return;
    setSaveScheduleMsg(null);
    setChairmanEnrichedIssues([]);
    setChairmanGaByIssueKey({});
    setConflictDetailLoading(true);
    try {
      const scan = await runCampusConflictScan({
        academicPeriodId,
        localEntries: filterByProgramMode(allTermScheduleEntries, programMode),
        localSparseBlocks: sparseCampusUniverse,
        apiMode: "doi_campus",
        programMode,
      });
      const mergedIssueList = scan.issues;
      const ids = scan.conflictingEntryIds;
      setCampusScanConflictIds(ids);

      const entryById = new Map(allTermScheduleEntries.map((e) => [e.id, e] as const));
      const rowById = new Map(rows.map((r) => [r.id, r] as const));
      /**
       * GA universe needs fully-specified resource ids; keep using the merged blocks (DB + worksheet overlay)
       * which already omit incomplete rows.
       */
      const blockById = new Map(mergedBlocksForCampusScan.map((b) => [b.id, b] as const));
      const enriched: EnrichedCampusIssue[] = [];
      const seen = new Set<string>();

      const snapshotFromId = (id: string) => {
        const fromDb = entryById.get(id);
        if (fromDb) {
          return {
            entryId: fromDb.id,
            what: `${subjectCodeById.get(fromDb.subjectId) ?? "—"} · ${sectionNameById.get(fromDb.sectionId) ?? "—"}`,
            when: `${fromDb.day} ${formatTimeRange(fromDb.startTime, fromDb.endTime)}`,
            where: roomById.get(fromDb.roomId)?.code ?? "TBA",
            who: userById.get(fromDb.instructorId)?.name ?? "—",
            collegeName: "",
          };
        }
        const r = rowById.get(id);
        if (!r) return null;
        const tb = rowTimeBounds(r, programCodeForSummary);
        const time = tb ? formatTimeRange(tb.start.startTime, tb.endSlot.endTime) : "—";
        return {
          entryId: r.id,
          what: `${r.subjectCode || "—"} · ${sectionNameById.get(r.sectionId) ?? "—"}`,
          when: `${r.day} ${time}`,
          where: roomById.get(r.roomId)?.code ?? "TBA",
          who: userById.get(r.instructorId)?.name ?? "—",
          collegeName: "",
        };
      };

      for (const raw of mergedIssueList) {
        if (!raw.relatedEntryId) continue;
        const t = raw.type;
        if (t !== "faculty" && t !== "room" && t !== "section") continue;
        const rowA = snapshotFromId(raw.entryId);
        const rowB = snapshotFromId(raw.relatedEntryId);
        if (!rowA || !rowB) continue;
        const sorted = [rowA.entryId, rowB.entryId].sort();
        const key = `${t}:${sorted[0]}:${sorted[1]}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const fixHint =
          "Next step: move one class to another day/time, pick a different room, or assign another instructor so only one meeting uses the slot.";
        const rootCause =
          t === "room"
            ? `Room double-booking: ${rowA.where} has two classes at the same time. (A) ${rowA.what} · ${rowA.who} @ ${rowA.when} vs (B) ${rowB.what} · ${rowB.who} @ ${rowB.when}. ${fixHint}`
            : t === "faculty"
              ? `Faculty double-booking: ${rowA.who} is assigned to two classes at the same time. (A) ${rowA.what} @ ${rowA.when} in ${rowA.where} vs (B) ${rowB.what} @ ${rowB.when} in ${rowB.where}. ${fixHint}`
              : `Section double-book: ${rowA.what.split("·")[1]?.trim() ?? "this section"} has two subjects scheduled at the same time. (A) ${rowA.what} @ ${rowA.when} in ${rowA.where} vs (B) ${rowB.what} @ ${rowB.when} in ${rowB.where}. ${fixHint}`;
        enriched.push({ key, type: t, rootCause, rowA, rowB });
      }

      setChairmanEnrichedIssues(enriched);

      const gaMap: Record<string, GASuggestion[]> = {};
      const roomIds = rooms
        .filter((r) => !chairmanCollegeId || !r.collegeId || r.collegeId === chairmanCollegeId)
        .map((r) => r.id);
      const instructorIds = dbInstructors
        .filter((u) => !chairmanCollegeId || u.collegeId === chairmanCollegeId)
        .filter((u) => u.role === "instructor" || u.role === "chairman_admin")
        .map((u) => u.id);
      if (roomIds.length > 0 && instructorIds.length > 0 && mergedBlocksForCampusScan.length > 0) {
        for (const iss of enriched.slice(0, 12)) {
          const block = blockById.get(iss.rowA.entryId);
          /**
           * Conflicts may involve incomplete rows (missing room/instructor). Suggestions still work:
           * use the subject+section identity from DB row or worksheet row to search a conflict-free placement.
           */
          const metaFromDb = entryById.get(iss.rowA.entryId);
          const metaFromRow = rowById.get(iss.rowA.entryId);
          const sectionId = metaFromDb?.sectionId ?? metaFromRow?.sectionId ?? "";
          const subjectId =
            metaFromDb?.subjectId ??
            (metaFromRow?.subjectCode
              ? subjectIdByCode.scoped.get(normalizeProspectusCode(metaFromRow.subjectCode)) ??
                subjectIdByCode.global.get(normalizeProspectusCode(metaFromRow.subjectCode))
              : undefined) ??
            "";
          if (!sectionId || !subjectId) continue;
          const durationHours =
            metaFromDb?.startTime && metaFromDb?.endTime ? slotDurationHours(metaFromDb.startTime, metaFromDb.endTime) : 2;
          const sug = runRuleBasedGeneticAlgorithm({
            universe: mergedBlocksForCampusScan,
            sectionId,
            subjectId,
            academicPeriodId,
            excludeEntryId: block?.id,
            durationHours,
            fixedInstructorId: metaFromDb?.instructorId ?? undefined,
            roomIds,
            instructorIds,
            maxFacultyHours,
            generations: 28,
            populationSize: 44,
          });
          gaMap[iss.key] = sug.slice(0, 5);
        }
      }
      setChairmanGaByIssueKey(gaMap);

      if (ids.size === 0) {
        setSaveScheduleMsg(scan.apiOk ? "No conflicts detected." : scan.apiError ?? "Conflict scan failed.");
      } else if (!scan.apiOk) {
        setSaveScheduleMsg(
          scan.apiError?.includes("SERVICE_ROLE")
            ? `Conflicts found: ${ids.size} row(s) — on-screen scan (campus-wide API unavailable).`
            : `Conflicts found: ${ids.size} row(s). Server scan failed: ${scan.apiError ?? "error"}`,
        );
      } else {
        setSaveScheduleMsg(`Conflicts found: ${ids.size} row(s).`);
      }
    } finally {
      setConflictDetailLoading(false);
    }
  }, [
    academicPeriodId,
    sparseCampusUniverse,
    mergedBlocksForCampusScan,
    chairmanCollegeId,
    rooms,
    dbInstructors,
    allTermScheduleEntries,
    rows,
    roomById,
    sectionNameById,
    subjectCodeById,
    subjectIdByCode,
    userById,
    programCodeForSummary,
  ]);

  useEffect(() => {
    const ser = [...plottedSubjectCodesForSection].sort().join(",");
    if (plottedSnapshotRef.current === "") {
      plottedSnapshotRef.current = ser;
      return;
    }
    if (ser === plottedSnapshotRef.current) return;
    const prev = new Set(plottedSnapshotRef.current.split(",").filter(Boolean));
    let flash: string | null = null;
    for (const c of plottedSubjectCodesForSection) {
      if (!prev.has(c)) {
        flash = c;
        break;
      }
    }
    plottedSnapshotRef.current = ser;
    if (!flash) return;
    setLastPlottedSubjectFlash(flash);
    const id = window.setTimeout(() => setLastPlottedSubjectFlash(null), 4500);
    return () => window.clearTimeout(id);
  }, [plottedSubjectCodesForSection]);

  const chairmanConflictDeepLinkKey = useRef<string | null>(null);
  useEffect(() => {
    chairmanConflictDeepLinkKey.current = null;
  }, [academicPeriodId]);

  useEffect(() => {
    if (searchParams.get("conflicts") !== "1" || !academicPeriodId) return;
    if (mergedBlocksForCampusScan.length === 0) return;
    const k = `${academicPeriodId}:${searchParams.toString()}`;
    if (chairmanConflictDeepLinkKey.current === k) return;
    chairmanConflictDeepLinkKey.current = k;
    runCampusConflictCheck();
  }, [searchParams, academicPeriodId, mergedBlocksForCampusScan.length, runCampusConflictCheck]);

  useEffect(() => {
    if (searchParams.get("conflicts") !== "1") return;
    const first = [...campusScanConflictIds][0];
    if (!first) return;
    requestAnimationFrame(() => {
      document.getElementById(`chairman-eval-row-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [searchParams, campusScanConflictIds]);

  /**
   * Faculty load + justification must match INS Form 5A and faculty “My Schedule”:
   * merge **every** persisted row for this term with unsaved worksheet rows (same id wins from the grid).
   * Totals are campus-wide per instructor — not a slice of only the chairman’s college.
   */
  const mergedEntriesForCollegePolicy = useMemo((): ScheduleEntry[] => {
    if (!academicPeriodId) return [];
    return buildWorksheetPolicyScheduleEntries({
      rows,
      allTermScheduleEntries,
      academicPeriodId,
      programId,
      programCodeForSummary,
      programMode,
      slots: slotsForMode,
    });
  }, [academicPeriodId, allTermScheduleEntries, rows, programId, programCodeForSummary]);

  const policyRows = useMemo(() => {
    if (!academicPeriodId || !chairmanCollegeId) {
      return {
        hasAnyViolation: false,
        hasTeachingLoadJustificationViolation: false,
        rows: [] as ReturnType<typeof evaluateFacultyLoadsForCollege>["rows"],
      };
    }
    return evaluateFacultyLoadsForCollege(
      mergedEntriesForCollegePolicy,
      subjectByIdForPolicy,
      userById,
      profileByUserId,
      chairmanCollegeId,
      (sid) => sectionToCollegeId(sid),
      policyConstants,
    );
  }, [
    mergedEntriesForCollegePolicy,
    academicPeriodId,
    chairmanCollegeId,
    subjectByIdForPolicy,
    userById,
    profileByUserId,
    sectionToCollegeId,
    policyConstants,
  ]);

  useEffect(() => {
    if (!onPolicySnapshot) return;
    const rateByInstructorId: Record<string, number | null> = {};
    for (const p of facultyProfiles) {
      rateByInstructorId[p.userId] = p.ratePerHour;
    }
    onPolicySnapshot({
      rows: policyRows.rows,
      hasAnyViolation: policyRows.hasAnyViolation,
      rateByInstructorId,
    });
  }, [policyRows, facultyProfiles, onPolicySnapshot]);

  /** VPAA justification modal only when weekly teaching contact exceeds this instructor’s allowed load. */
  const showJustification = policyRows.hasTeachingLoadJustificationViolation;

  /** Live "hours so far / cap" snapshot for the plot modal's instructor-select warning. */
  const instructorLoadById = useMemo(() => {
    const m = new Map<string, { hours: number; cap: number }>();
    for (const r of policyRows.rows) {
      const profile = profileByUserId.get(r.instructorId) ?? null;
      const cap = instructorMaxWeeklyTeachingCapFromProfile(profile, policyConstants);
      m.set(r.instructorId, { hours: r.weeklyTotalContactHours, cap });
    }
    return m;
  }, [policyRows.rows, profileByUserId, policyConstants]);

  const overloadedInstructorIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of policyRows.rows) {
      if (rowNeedsTeachingLoadJustification(r)) ids.add(r.instructorId);
    }
    return ids;
  }, [policyRows.rows]);

  /** Persists overload explanation to `ScheduleLoadJustification` (same table as Central Hub Evaluator). */
  const saveLoadJustificationForDoi = useCallback(
    async (rowsSnapshot?: PlotRow[]) => {
    if (!academicPeriodId || !chairmanCollegeId) {
      setJustificationMsg("Select a term and ensure your college is in scope.");
      return false;
    }
    const t = justificationText.trim();
    if (t.length < 12) {
      setJustificationMsg("Enter at least 12 characters for VPAA review.");
      return false;
    }
    const rowsForJustif = rowsSnapshot ?? rows;
    const mergedForJustif = buildWorksheetPolicyScheduleEntries({
      rows: rowsForJustif,
      allTermScheduleEntries,
      academicPeriodId,
      programId,
      programCodeForSummary,
      programMode,
      slots: slotsForMode,
    });
    const polJustif = evaluateFacultyLoadsForCollege(
      mergedForJustif,
      subjectByIdForPolicy,
      userById,
      profileByUserId,
      chairmanCollegeId,
      (sid) => sectionToCollegeId(sid),
      policyConstants,
    );
    if (!polJustif.hasTeachingLoadJustificationViolation) {
      setJustificationMsg("No teaching load overage detected; a justification is not required.");
      return false;
    }
    setJustificationSaving(true);
    setJustificationMsg(null);
    try {
      const { user } = await authApi.me();
      if (!user) {
        setJustificationMsg("Not signed in.");
        return false;
      }
      const author = dbInstructors.find((u) => u.id === user.id);
      const authorName = author?.name ?? user.email ?? user.id;
      const violators = polJustif.rows.filter((r) => rowNeedsTeachingLoadJustification(r));
      const snapRows = violators.map(
        (r) =>
          `${r.instructorName}: ${r.weeklyTotalContactHours.toFixed(1)} hrs/wk — ${r.violations.map((v) => v.code).join(", ")}`,
      );
      for (const v of violators) {
        const plottedForFaculty = rowsForJustif.filter(
          (r) => r.instructorId === v.instructorId && rowFullyPlotted(r, programCodeForSummary),
        );
        const scheduleEntryId = plottedForFaculty[0]?.id ?? null;
        await apiFetch("/api/catalog/schedule-load-justifications", {
          method: "POST",
          body: {
            academicPeriodId,
            collegeId: chairmanCollegeId,
            facultyUserId: v.instructorId,
            scheduleEntryId,
            authorUserId: user.id,
            authorName,
            authorEmail: user.email ?? null,
            justification: t,
            violationsSnapshot: {
              summary: snapRows.join("\n"),
              detail: polJustif.rows,
              scheduleEntryIds: plottedForFaculty.map((r) => r.id),
              facultyWeeklyHours: v.weeklyTotalContactHours,
            },
          },
        });
      }
      dispatchInsCatalogReload();
      void recordScheduleWrite({
          action: "chairman.policy_justification_upsert",
          collegeId: chairmanCollegeId,
          academicPeriodId,
          details: { source: "bsit_evaluator_worksheet" },
        });
      setJustificationMsg("Justification saved for DOI / VPAA review.");
      return true;
    } finally {
      setJustificationSaving(false);
    }
  },
  [
    academicPeriodId,
    chairmanCollegeId,
    justificationText,
    dbInstructors,
    rows,
    allTermScheduleEntries,
    programId,
    programCodeForSummary,
    subjectByIdForPolicy,
    userById,
    profileByUserId,
    sectionToCollegeId,
    policyConstants,
  ],
);

  function computePatchedPlotRow(row: PlotRow, patch: Partial<PlotRow>): PlotRow {
    const next = { ...row, ...patch };
    const p = next.subjectCode ? prospectusRowForProgram(programCodeForSummary, next.subjectCode) : undefined;
    if (p) {
      const d = plotRowDurationSlots(p, next);
      const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - d;
      if (next.startSlotIndex > maxS) return { ...next, startSlotIndex: maxS };
    }
    return next;
  }

  /** Low-level row update (no policy gate) — use for fields that do not affect contact hours. */
  function updateRow(id: string, patch: Partial<PlotRow>) {
    if (LOCAL_EDIT_PLOT_KEYS.some((k) => patch[k] !== undefined)) {
      locallyEditedRowIdsRef.current.add(id);
    }
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r;
        if (r.lockedByDoiAt) return r;
        return computePatchedPlotRow(r, patch);
      });
      const updated = next.find((r) => r.id === id);
      if (updated) window.setTimeout(() => notifyRealtimeConflicts(updated), 0);
      return next;
    });
  }

  /**
   * Before applying instructor/day/slot/subject/room changes on a fully plotted row, ensure overload policy:
   * if the hypothetical campus-wide load violates caps, require justification (same modal as Save).
   */
  function commitRowPatch(id: string, patch: Partial<PlotRow>, baseRow?: PlotRow) {
    const row = baseRow ?? rows.find((r) => r.id === id);
    if (!row || row.lockedByDoiAt) return;
    const candidate = computePatchedPlotRow(row, patch);
    const loadKeys: (keyof PlotRow)[] = ["instructorId", "subjectCode", "startSlotIndex", "day", "roomId"];
    const affectsLoad = loadKeys.some((k) => patch[k] !== undefined && patch[k] !== row[k]);
    if (
      affectsLoad &&
      chairmanCollegeId &&
      rowFullyPlotted(candidate, programCodeForSummary) &&
      candidate.instructorId
    ) {
      const hypotheticalRows = rows.some((r) => r.id === id)
        ? rows.map((r) => (r.id === id ? candidate : r))
        : [...rows, candidate];
      const merged = buildWorksheetPolicyScheduleEntries({
        rows: hypotheticalRows,
        allTermScheduleEntries,
        academicPeriodId,
        programId,
        programCodeForSummary,
        programMode,
        slots: slotsForMode,
      });
      const pol = evaluateFacultyLoadsForCollege(
        merged,
        subjectByIdForPolicy,
        userById,
        profileByUserId,
        chairmanCollegeId,
        (sid) => sectionToCollegeId(sid),
        policyConstants,
      );
      const hit = pol.rows.find(
        (x) => x.instructorId === candidate.instructorId && rowNeedsTeachingLoadJustification(x),
      );
      if (hit && justificationText.trim().length < 12) {
        policyAssignGateRef.current = candidate;
        setPolicyModalReason("assign");
        setPolicyJustificationModalOpen(true);
        return;
      }
    }
    updateRow(id, patch);
  }

  const applyPlotFromModal = useCallback(
    (draft: PlotRow, buildingValue: string) => {
      if (schedulePublished || draft.lockedByDoiAt) return;
      if (buildingValue) {
        setRoomBuildingByRowId((prev) => ({ ...prev, [draft.id]: buildingValue }));
      }
      const exists = rows.some((r) => r.id === draft.id);
      const plotPatch: Partial<PlotRow> = {
        sectionId: draft.sectionId,
        subjectCode: draft.subjectCode,
        lecLabMode: draft.lecLabMode,
        instructorId: draft.instructorId,
        roomId: draft.roomId,
        day: draft.day,
        startSlotIndex: draft.startSlotIndex,
      };
      if (!exists) {
        flushSync(() => {
          locallyEditedRowIdsRef.current.add(draft.id);
          setRows((prev) => [...prev, draft]);
        });
      }
      commitRowPatch(draft.id, plotPatch, exists ? undefined : draft);
      updateRow(draft.id, { students: draft.students });
    },
    [rows, schedulePublished, commitRowPatch, updateRow],
  );

  function removeRow(id: string) {
    locallyEditedRowIdsRef.current.delete(id);
    setRows((prev) => {
      if (prev.some((r) => r.id === id && r.lockedByDoiAt)) return prev;
      return prev.filter((r) => r.id !== id);
    });
  }

  useEffect(() => {
    didHydrateFromDbRef.current = false;
    lastSyncedByModeRef.current = { day: new Set(), night: new Set() };
    locallyEditedRowIdsRef.current.clear();
    setDayRows([]);
    setNightRows([]);
  }, [academicPeriodId]);

  const reloadScheduleFromDb = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  /** GEC / hub / other-role saves: pull fresh `ScheduleEntry` rows so campus-wide conflict checks stay accurate. */
  useScheduleEntryCrossReload(reloadScheduleFromDb, {
    academicPeriodId,
    enabled: Boolean(academicPeriodId),
  });

  const applyChairmanConflictSuggestion = useCallback(
    async (issueKey: string, s: GASuggestion) => {
      const iss = chairmanEnrichedIssues.find((i) => i.key === issueKey);
      if (!iss) return;
      const row = rows.find((r) => r.id === iss.rowA.entryId);
      if (row?.lockedByDoiAt) return;
      setBusyChairmanApplyKey(issueKey);
      try {
        const pad = (t: string) => (t.trim().length <= 5 ? `${t.trim()}:00` : t.trim());
        await apiFetch(`/api/catalog/schedule-entries/${iss.rowA.entryId}`, {
          method: "PATCH",
          body: {
            day: s.day,
            startTime: pad(s.startTime),
            endTime: pad(s.endTime),
            roomId: s.roomId,
          },
        });
        setChairmanEnrichedIssues([]);
        setChairmanGaByIssueKey({});
        setCampusScanConflictIds(new Set());
        locallyEditedRowIdsRef.current.delete(iss.rowA.entryId);
        await reloadScheduleFromDb();
        dispatchInsCatalogReload();
        void recordScheduleWrite({
            action: "chairman.conflict_apply",
            collegeId: chairmanCollegeId,
            academicPeriodId,
            details: {
              entryId: iss.rowA.entryId,
              issueKey,
              subjectCode: row?.subjectCode ?? "",
              sectionName: row?.sectionId ? (sectionNameById.get(row.sectionId) ?? "") : "",
              applied: {
                day: s.day,
                startTime: pad(s.startTime),
                endTime: pad(s.endTime),
                roomId: s.roomId,
              },
            },
          });
        void runCampusConflictCheck();
      } finally {
        setBusyChairmanApplyKey(null);
      }
    },
    [
      chairmanEnrichedIssues,
      rows,
      reloadScheduleFromDb,
      chairmanCollegeId,
      academicPeriodId,
      runCampusConflictCheck,
      sectionNameById,
    ],
  );

  useEffect(() => {
    if (!academicPeriodId || !chairmanCollegeId) return;
    writeEvaluatorSessionSnapshot({
      version: 1,
      academicPeriodId,
      collegeId: chairmanCollegeId,
      programId: chairmanProgramId,
      rows: rows.map((r) => ({
        id: r.id,
        sectionId: r.sectionId,
        students: r.students,
        subjectCode: r.subjectCode,
        instructorId: r.instructorId,
        roomId: r.roomId,
        startSlotIndex: r.startSlotIndex,
        day: r.day,
      })),
      updatedAt: new Date().toISOString(),
    });
  }, [rows, academicPeriodId, chairmanCollegeId, chairmanProgramId]);

  useEffect(() => {
    const on = () => setConnOnline(true);
    const off = () => setConnOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  /**
   * Recovery: if DB has no rows yet for this scope, restore from localStorage backup snapshot.
   * This covers sudden power loss / tab crash before a manual save.
   */
  useEffect(() => {
    if (!academicPeriodId || !chairmanCollegeId) return;
    const backup = readEvaluatorBackupSnapshot();
    if (!backup) return;
    if (backup.academicPeriodId !== academicPeriodId) return;
    if (backup.collegeId !== chairmanCollegeId) return;
    if (backup.programId !== chairmanProgramId) return;
    if (didHydrateFromDbRef.current && rows.length === 0 && backup.rows.length > 0) {
      setRows(
        backup.rows.map((r) =>
          normalizePlotRow(
            {
              id: r.id,
              sectionId: r.sectionId,
              students: r.students,
              subjectCode: r.subjectCode,
              lecLabMode: "lec",
              instructorId: r.instructorId,
              roomId: r.roomId,
              startSlotIndex: r.startSlotIndex,
              day: r.day as BsitEvaluatorWeekday,
              lockedByDoiAt: null,
            },
            programCodeForSummary,
          ),
        ),
      );
      for (const r of backup.rows) {
        locallyEditedRowIdsRef.current.add(r.id);
      }
      toast.info("Recovered unsaved draft", "Restored your last local backup after an interruption.");
    }
  }, [academicPeriodId, chairmanCollegeId, chairmanProgramId, rows.length, toast]);

  /**
   * Writes worksheet rows to `ScheduleEntry` (same source as INS Faculty / Section / Room).
   * Autosave is debounced; &quot;Save schedule&quot; flushes immediately and dispatches `ins-catalog-reload`.
   */
  const performSchedulePersist = useCallback(
    async (source: "autosave" | "manual") => {
      if (!academicPeriodId) return;
      if (source === "autosave" && !didHydrateFromDbRef.current) return;
      if (source === "autosave" && typeof navigator !== "undefined" && navigator.onLine === false) {
        lastOfflineEditAtRef.current = Date.now();
        return;
      }
      if (source === "manual") {
        setSaveScheduleBusy(true);
        setSaveScheduleMsg(null);
      }
      try {
        const { user } = await authApi.me();
        if (!user) {
          if (source === "manual") setSaveScheduleMsg("Not signed in.");
          return;
        }

        const upserts: ScheduleEntry[] = [];
        const skipped: Array<{ rowId: string; sectionId: string; subjectCode: string; reason: string }> = [];
        for (const row of rows) {
          if (row.lockedByDoiAt) continue;
          if (!row.sectionId || !row.subjectCode) {
            skipped.push({
              rowId: row.id,
              sectionId: row.sectionId,
              subjectCode: row.subjectCode,
              reason: "Pick section and subject code",
            });
            continue;
          }
          if (!row.instructorId || !row.roomId) {
            skipped.push({
              rowId: row.id,
              sectionId: row.sectionId,
              subjectCode: row.subjectCode,
              reason: "Pick instructor and room",
            });
            continue;
          }
          const codeKey = normalizeProspectusCode(row.subjectCode);
          const subjectId = subjectIdByCode.scoped.get(codeKey) ?? subjectIdByCode.global.get(codeKey);
          if (!subjectId) {
            skipped.push({
              rowId: row.id,
              sectionId: row.sectionId,
              subjectCode: row.subjectCode,
              reason: "Subject code not found in database Subject table",
            });
            continue;
          }
          const tb = rowTimeBounds(row, programCodeForSummary, slotsForMode);
          if (!tb) {
            skipped.push({
              rowId: row.id,
              sectionId: row.sectionId,
              subjectCode: row.subjectCode,
              reason: "Pick a valid time slot (subject duration may not fit)",
            });
            continue;
          }
          upserts.push({
            id: row.id,
            academicPeriodId,
            subjectId,
            instructorId: row.instructorId,
            sectionId: row.sectionId,
            roomId: row.roomId,
            day: row.day,
            startTime: tb.start.startTime,
            endTime: tb.endSlot.endTime,
            status: "draft",
            programMode,
          });
        }

        const currentIds = new Set(rows.map((r) => r.id));
        const prevIds = lastSyncedByModeRef.current[programMode];
        const removedIds = Array.from(prevIds).filter(
          (id) => !currentIds.has(id) && !lockedEntryIdsRef.current.has(id),
        );

        const buildSkippedDigest = () => {
          const top = skipped.slice(0, 3).map((s) => {
            const sec = s.sectionId ? (sectionNameById.get(s.sectionId) ?? s.sectionId) : "—";
            return `${s.subjectCode || "—"} (${sec}): ${s.reason}`;
          });
          const more = skipped.length > 3 ? ` (+${skipped.length - 3} more)` : "";
          return { top, more, text: `${top.join(" · ")}${more}` };
        };

        const showSkippedMsg = (mode: "none_saved" | "partial") => {
          if (source !== "manual") return;
          if (skipped.length === 0) return;
          const d = buildSkippedDigest();
          if (mode === "none_saved") {
            toast.error("Nothing saved", d.text);
            setSaveScheduleMsg(`Nothing saved. Fix incomplete rows: ${d.text}`);
          } else {
            toast.info("Some rows were not saved", d.text);
            setSaveScheduleMsg(`Saved with warnings. Some rows were not saved: ${d.text}`);
          }
        };

        const conflictScan = scanAllSparseScheduleConflicts(sparseCampusUniverse);
        if (conflictScan.issues.length > 0) {
          const preview = conflictScan.issueSummaries.slice(0, 3).join(" · ");
          const more =
            conflictScan.issueSummaries.length > 3
              ? ` (+${conflictScan.issueSummaries.length - 3} more)`
              : "";
          const msg = `${preview}${more}`;
          if (source === "manual") {
            setSaveScheduleMsg(`Resolve timetable conflicts before saving: ${msg}`);
            toast.error("Cannot save until conflicts are resolved", msg);
          }
          return;
        }

        if (removedIds.length > 0) {
          try {
            for (const id of removedIds) {
              await apiFetch(`/api/catalog/schedule-entries/${id}`, { method: "DELETE" });
            }
            for (const id of removedIds) {
              locallyEditedRowIdsRef.current.delete(id);
            }
          } catch (e: any) {
            setLoadError(e?.message ?? "Delete failed");
            if (source === "manual") setSaveScheduleMsg(e?.message ?? "Delete failed");
            if (source === "manual") toast.error("Failed to save. Please try again.", e?.message ?? "Delete failed");
            return;
          }
        }

        if (upserts.length > 0) {
          try {
            await apiFetch("/api/catalog/schedule-entries-upsert", { method: "POST", body: upserts });
          } catch (e: any) {
            setLoadError(e?.message ?? "Upsert failed");
            if (source === "manual") setSaveScheduleMsg(e?.message ?? "Upsert failed");
            if (source === "manual") toast.error("Failed to save. Please try again.", e?.message ?? "Upsert failed");
            return;
          }
        }

        const wrote = upserts.length > 0 || removedIds.length > 0;
        if (!wrote) {
          showSkippedMsg("none_saved");
        }
        if (wrote) {
          postPersistUiMergeRef.current = {
            until: Date.now() + 15_000,
            ids: new Set(upserts.map((u) => u.id)),
          };
          window.setTimeout(() => {
            const g = postPersistUiMergeRef.current;
            if (g && Date.now() >= g.until) postPersistUiMergeRef.current = null;
          }, 15_600);
          const auditRows = upserts.map((e) => {
            const plot = rows.find((x) => x.id === e.id);
            return {
              subjectCode: plot?.subjectCode ?? "—",
              sectionName: plot?.sectionId ? (sectionNameById.get(plot.sectionId) ?? "") : "",
              day: e.day,
              startTime: e.startTime,
              endTime: e.endTime,
            };
          });
          /** INS forms subscribe to this event via `useInsCatalog` — include period id so other pages refresh the correct term immediately. */
          dispatchInsCatalogReload({ academicPeriodId });
          if (source === "manual") {
            void recordScheduleWrite({
                action: "chairman.evaluator_save",
                collegeId: chairmanCollegeId,
                academicPeriodId,
                details: {
                  upsertCount: upserts.length,
                  deleteCount: removedIds.length,
                  rows: auditRows,
                },
              });
          }
        }

        lastSyncedByModeRef.current[programMode] = new Set(rows.map((r) => r.id));

        if (source === "manual") {
          setSaveScheduleMsg(
            wrote
              ? "Schedule saved. INS Faculty, Section, and Room views refresh for all users."
              : skipped.length > 0
                ? "Nothing saved. Some rows are incomplete or use subject codes not found in the database."
                : "Nothing new to save (draft already matches the database).",
          );
          if (wrote) {
            toast.success("Schedule saved successfully");
            if (skipped.length > 0) showSkippedMsg("partial");
          }
        }
        if (source === "autosave" && wrote) {
          const now = Date.now();
          setLastDraftSaveAt(new Date());
          /** Avoid spamming autosave toasts on frequent edits. */
          if (now - lastAutosaveToastAtRef.current > 30_000) {
            lastAutosaveToastAtRef.current = now;
            toast.success("Draft saved automatically");
          }
        }
      } finally {
        if (source === "manual") setSaveScheduleBusy(false);
      }
    },
    [rows, academicPeriodId, subjectIdByCode, chairmanCollegeId, sectionNameById, toast, programCodeForSummary, programId, allTermScheduleEntries, sparseCampusUniverse, programMode, slotsForMode],
  );

  /** When connection is restored, flush the most recent autosave immediately (no waiting 9s). */
  useEffect(() => {
    const onOnline = () => {
      if (!academicPeriodId) return;
      if (!didHydrateFromDbRef.current) return;
      if (rows.length === 0) return;
      void performSchedulePersist("autosave");
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [academicPeriodId, rows.length, performSchedulePersist]);

  useEffect(() => {
    if (!academicPeriodId) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      void performSchedulePersist("autosave");
    }, 9000);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [rows, academicPeriodId, performSchedulePersist]);

  if (loadError) {
    return <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{loadError}</div>;
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {schedulePublished ? (
        <div
          className="rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-[13px] text-sky-950 leading-relaxed"
          role="status"
        >
          <span className="font-semibold">Published schedule (read-only).</span> DOI/VPAA has published this term&apos;s
          master schedule. Plotted slots cannot be edited here; changes require a schedule change request workflow if
          your campus uses one.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-[13px] font-semibold text-black/75">
        <span>Section</span>
        <select
          className="h-10 min-w-[220px] rounded-lg border border-black/25 bg-white px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40 disabled:opacity-60 disabled:pointer-events-none"
          value={selectedSectionId}
          disabled={schedulePublished}
          onChange={(e) => setSelectedSectionId(e.target.value)}
        >
          <option value="">All sections</option>
          {Array.from(sectionNameById.entries()).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <ProgramModeToggle size="sm" />
      </div>

      <ChairmanProgramProspectusSummaryTable
        programCode={programCodeForSummary}
        programName={chairmanProgramName ?? undefined}
        selectedSectionId={selectedSectionId}
        yearLevelFilter={summaryYearLevelFilter}
        filterSemester={termProspectusSemester}
        plottedSubjectCodes={plottedSubjectCodesForSection}
        lastPlottedSubjectCode={lastPlottedSubjectFlash}
      />

      {showJustification ? <PolicyViolationFaq /> : null}

      <BsitChairmanInteractiveWeekGrid
        rows={rows}
        programMode={programMode}
        weekdays={[...evaluatorWeekdaysForMode(programMode)]}
        timeSlots={slotsForMode}
        programCodeForSummary={programCodeForSummary}
        programSections={programSections}
        selectedSectionId={selectedSectionId}
        schedulePublished={schedulePublished}
        instructorPlotOptions={instructorPlotOptions}
        roomsForEvaluatorGrid={roomsForEvaluatorGrid}
        roomById={roomById}
        roomBuildingByRowId={roomBuildingByRowId}
        setRoomBuildingByRowId={setRoomBuildingByRowId}
        sectionNameById={sectionNameById}
        instructorDisplayById={instructorDisplayById}
        roomCodeById={roomCodeById}
        termProspectusSemester={termProspectusSemester}
        plottedCodesBySectionId={plottedCodesBySectionId}
        conflictForRow={conflictForRow}
        conflictDetailForRow={conflictDetailForRow}
        campusScanConflictIds={campusScanConflictIds}
        overloadedInstructorIds={overloadedInstructorIds}
        instructorLoadById={instructorLoadById}
        academicPeriodId={academicPeriodId ?? ""}
        sparseCampusUniverse={sparseCampusUniverse}
        onApplyPlot={applyPlotFromModal}
        onRemoveRow={removeRow}
        majorOptions={majorOptions}
        insFormBasePath="/chairman/ins"
        plottingActions={{
          onRunConflictCheck: () => void runCampusConflictCheck(),
          onSaveSchedule: () => {
            if (autosaveTimerRef.current) {
              clearTimeout(autosaveTimerRef.current);
              autosaveTimerRef.current = null;
            }
            if (policyRows.hasTeachingLoadJustificationViolation) {
              const t = justificationText.trim();
              if (t.length < 12) {
                setPolicyModalReason("save");
                setPolicyJustificationModalOpen(true);
                return;
              }
              void saveLoadJustificationForDoi().then((ok) => {
                if (!ok) return;
                return performSchedulePersist("manual");
              });
              return;
            }
            void performSchedulePersist("manual");
          },
          runConflictCheckDisabled:
            schedulePublished || !academicPeriodId || mergedBlocksForCampusScan.length === 0,
          saveScheduleDisabled: schedulePublished,
          saveScheduleBusy,
          connOnline,
          lastDraftSaveAt,
        }}
        gridFooter={
          <>
            {instructorPlotOptions.length === 0 ? (
              <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No instructors with an Employee ID in this college. Add faculty in <strong>Faculty Profile</strong> and
                set their Employee ID before plotting.
              </p>
            ) : null}
            {saveScheduleMsg ? (
              <p className="text-[12px] text-black/70 border border-black/10 rounded-lg px-3 py-2 bg-emerald-50/80">
                {saveScheduleMsg}
              </p>
            ) : null}
            {conflictDetailLoading ? (
              <p className="text-[11px] text-black/50">Loading conflict detail…</p>
            ) : chairmanEnrichedIssues.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] text-black/55">
                  Detail below uses saved database rows; unsaved rows in this worksheet may add overlaps not listed.
                </p>
                <EnrichedConflictIssuesPanel
                  issues={chairmanEnrichedIssues}
                  allowApply={!schedulePublished}
                  suggestionsByIssueKey={chairmanGaByIssueKey}
                  busyIssueKey={busyChairmanApplyKey}
                  onApplySuggestion={(k, s) => void applyChairmanConflictSuggestion(k, s)}
                  formatSuggestionLabel={(sug) =>
                    formatGaSuggestionShortLabel(sug, {
                      roomCode: roomById.get(sug.roomId)?.code ?? sug.roomId,
                      instructorDisplay: formatUserInstructorLabel(
                        userById.get(sug.instructorId),
                        facultyProfileByUserId.get(sug.instructorId),
                      ),
                    })
                  }
                  title="Conflicts & suggested fixes"
                  maxIssues={12}
                />
              </div>
            ) : null}
          </>
        }
      />

      

      {showJustification ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-2">
          <div className="text-[14px] font-semibold text-amber-950">Justification (DOI / VPAA review)</div>
          <p className="text-[12px] text-amber-950/85 leading-relaxed">
            Faculty load rules are exceeded for this draft ({policyConstants.STANDARD_WEEKLY_TEACHING_HOURS}{" "}
            hrs/wk reference). Enter a reason below; it will be available to DOI Admin for inspection and approval.
          </p>
          <textarea
            className="w-full min-h-[100px] rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
            value={justificationText}
            disabled={schedulePublished}
            onChange={(e) => setJustificationText(e.target.value)}
            placeholder="e.g. Approved overload; temporary faculty shortage; consolidated sections…"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="bg-amber-900 hover:bg-amber-950 text-white"
              disabled={schedulePublished || justificationSaving}
              onClick={() => void saveLoadJustificationForDoi()}
            >
              {justificationSaving ? "Saving…" : "Submit justification for VPAA (DOI)"}
            </Button>
            <span className="text-[11px] text-amber-950/70">
              Draft rows still sync to the hub automatically; this button records the written overload reason for Policy
              reviews.
            </span>
          </div>
          {justificationMsg ? <p className="text-[12px] text-amber-950">{justificationMsg}</p> : null}
        </div>
      ) : null}

      <PolicyJustificationModal
        open={policyJustificationModalOpen && (policyModalReason === "assign" || showJustification)}
        title={policyModalReason === "assign" ? "Overload: justify before assigning" : "Policy justification"}
        promptText={
          policyModalReason === "assign"
            ? "This assignment pushes the instructor past the faculty load policy. Enter a justification for DOI/VPAA review, then the assignment will be kept and saved."
            : "This assignment exceeds the faculty load policy. Do you want to proceed with justification?"
        }
        confirmButtonLabel={policyModalReason === "assign" ? "Record justification & apply assignment" : undefined}
        value={justificationText}
        minLength={12}
        saving={justificationSaving || saveScheduleBusy}
        onChange={setJustificationText}
        onCancel={() => {
          policyAssignGateRef.current = null;
          setPolicyJustificationModalOpen(false);
        }}
        onSave={async () => {
          const pendingAssign = policyAssignGateRef.current;
          if (pendingAssign) {
            policyAssignGateRef.current = null;
            locallyEditedRowIdsRef.current.add(pendingAssign.id);
            const nextRows = rows.map((r) => (r.id === pendingAssign.id ? pendingAssign : r));
            setRows(nextRows);
            const ok = await saveLoadJustificationForDoi(nextRows);
            if (!ok) return;
            setPolicyJustificationModalOpen(false);
            await performSchedulePersist("manual");
            return;
          }
          const ok = await saveLoadJustificationForDoi();
          if (!ok) return;
          setPolicyJustificationModalOpen(false);
          await performSchedulePersist("manual");
        }}
      />
    </div>
  );
}
