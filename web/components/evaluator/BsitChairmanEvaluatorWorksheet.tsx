"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Q } from "@/lib/supabase/catalog-columns";
import {
  detectConflictsSparse,
  scanAllSparseScheduleConflicts,
  scheduleBlockToSparseBlock,
} from "@/lib/scheduling/conflicts";
import type { SparseScheduleBlock } from "@/lib/scheduling/conflicts";
import { evaluateFacultyLoadsForCollege } from "@/lib/scheduling/facultyPolicies";
import type { GASuggestion, ScheduleBlock } from "@/lib/scheduling/types";
import { runRuleBasedGeneticAlgorithm } from "@/lib/scheduling/ruleBasedGA";
import { formatGaSuggestionShortLabel } from "@/lib/scheduling/conflict-suggestion-label";
import type { FacultyProfile, Program, Room, ScheduleEntry, ScheduleLoadJustification, Section, Subject, User } from "@/types/db";
import { AlertTriangle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  normalizeScheduleEntryDayForEvaluator,
  normalizeSlotHHMM,
  startSlotIndexFromScheduleEntryStartTime,
} from "@/lib/chairman/evaluator-schedule-hydration";
import {
  BSIT_PROGRAM_CODE,
  normalizeProspectusCode,
  scheduleDurationSlots,
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
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import { BSIT_EVALUATOR_TIME_SLOTS, BSIT_EVALUATOR_WEEKDAYS, type BsitEvaluatorWeekday } from "@/lib/chairman/bsit-evaluator-constants";
import { FACULTY_POLICY_CONSTANTS } from "@/lib/scheduling/constants";
import { readEvaluatorBackupSnapshot, writeEvaluatorSessionSnapshot } from "@/lib/opticore-evaluator-session-sync";
import type { ChairmanPolicySnapshot } from "@/components/evaluator/ChairmanEvaluatorLoadPanel";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";
import { useScheduleEntryCrossReload } from "@/hooks/use-schedule-entry-cross-reload";
import { useOpticoreToast } from "@/components/alerts/OpticoreToastProvider";
import { ChairmanProgramProspectusSummaryTable } from "@/components/evaluator/ChairmanProgramProspectusSummaryTable";
import { EnrichedConflictIssuesPanel } from "@/components/campus-intelligence/EnrichedConflictIssuesPanel";
import { PolicyJustificationModal } from "@/components/evaluator/PolicyJustificationModal";
import type { EnrichedCampusIssue } from "@/lib/scheduling/conflict-enrichment";
import { formatTimeRange } from "@/lib/evaluator/schedule-evaluator-table";
import {
  formatInstructorPlotOptionLabel,
  formatUserInstructorLabel,
  mergeLegacyRowInstructorsIntoPlotOptions,
  usersToInstructorPlotOptions,
  type InstructorPlotOption,
} from "@/lib/evaluator/instructor-employee-id";
import { roomBuildingKey, roomsInBuilding, sortedBuildingLabels } from "@/lib/evaluator/room-by-building";

/** Fallback program code when session has no `chairmanProgramCode` (legacy chairman session). */
const DEFAULT_CHAIRMAN_PROGRAM_CODE: string = BSIT_PROGRAM_CODE;

const selectClass =
  "w-full min-h-10 rounded-md border border-black/25 bg-white px-2 text-[11px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";

export type PlotRow = {
  id: string;
  sectionId: string;
  students: number | "";
  subjectCode: string;
  instructorId: string;
  roomId: string;
  /** First 1-hour slot index (0 = 7:00–8:00 AM … 9 = 4:00–5:00 PM). */
  startSlotIndex: number;
  day: BsitEvaluatorWeekday;
  /** When set, VPAA published this row; RLS blocks chairman writes — do not upsert/delete. */
  lockedByDoiAt?: string | null;
};

function newRowId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `row-${Date.now()}-${Math.random()}`;
}

function emptyRow(): PlotRow {
  return {
    id: newRowId(),
    sectionId: "",
    students: "",
    subjectCode: "",
    instructorId: "",
    roomId: "",
    startSlotIndex: 0,
    day: "Monday",
    lockedByDoiAt: null,
  };
}

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

function rowTimeBounds(row: PlotRow, programCodeForSummary: string): { startIdx: number; start: (typeof BSIT_EVALUATOR_TIME_SLOTS)[0]; endSlot: (typeof BSIT_EVALUATOR_TIME_SLOTS)[0] } | null {
  const p = row.subjectCode ? prospectusRowForProgram(programCodeForSummary, row.subjectCode) : undefined;
  if (!p) return null;
  const dur = scheduleDurationSlots(p);
  const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - dur;
  const startIdx = Math.min(row.startSlotIndex, maxS);
  const start = BSIT_EVALUATOR_TIME_SLOTS[startIdx];
  const endIdx = startIdx + dur - 1;
  const endSlot = BSIT_EVALUATOR_TIME_SLOTS[endIdx];
  if (!start || !endSlot || startIdx < 0 || endIdx >= BSIT_EVALUATOR_TIME_SLOTS.length) return null;
  return { startIdx, start, endSlot };
}

/** Subject + day + start → interval; resources optional (for real-time conflict checks). */
function rowToSparseBlock(row: PlotRow, academicPeriodId: string, programCodeForSummary: string): SparseScheduleBlock | null {
  if (!academicPeriodId || !row.day) return null;
  const t = rowTimeBounds(row, programCodeForSummary);
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
  };
}

function rowToBlock(row: PlotRow, academicPeriodId: string, subjectIdForRow: string, programCodeForSummary: string): ScheduleBlock | null {
  if (!row.sectionId || !row.instructorId || !row.roomId || !row.subjectCode) return null;
  const p = prospectusRowForProgram(programCodeForSummary, row.subjectCode);
  if (!p) return null;
  const t = rowTimeBounds(row, programCodeForSummary);
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
  };
}

/** Campus-wide policy merge: persisted term rows + worksheet overlay (same rules as the `mergedEntriesForCollegePolicy` memo). */
function buildWorksheetPolicyScheduleEntries(args: {
  rows: PlotRow[];
  allTermScheduleEntries: ScheduleEntry[];
  academicPeriodId: string;
  programId: string;
  programCodeForSummary: string;
}): ScheduleEntry[] {
  const { rows, allTermScheduleEntries, academicPeriodId, programId, programCodeForSummary } = args;
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
      const b = rowToBlock(row, academicPeriodId, subj.id, programCodeForSummary);
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
  const [addRowBusy, setAddRowBusy] = useState(false);

  const [rows, setRows] = useState<PlotRow[]>([]);
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
   * After upsert, cross-reload can briefly return a stale row (day/slot) before read-your-writes catches up.
   * Prefer local day + slot for a few seconds so Friday (etc.) does not snap back to Monday.
   */
  const postPersistUiMergeRef = useRef<{ until: number; ids: Set<string> } | null>(null);
  /** Plot row waiting for VPAA justification before applying instructor/day/slot overload. */
  const policyAssignGateRef = useRef<PlotRow | null>(null);
  /** Two-step Building → Room UX (not persisted — `ScheduleEntry` still stores `roomId` only). */
  const [roomBuildingByRowId, setRoomBuildingByRowId] = useState<Record<string, string>>({});
  const lastSyncedRowIdsRef = useRef<Set<string>>(new Set());
  /** IDs loaded with `lockedByDoiAt` — never send DELETE for these if they disappear from state (e.g. scope change). */
  const lockedEntryIdsRef = useRef<Set<string>>(new Set());
  const didHydrateFromDbRef = useRef(false);

  /** Prospectus registry key — aligns with `Program.code` in Supabase (e.g. BSIT, BSENVS). */
  const programCodeForSummary = (chairmanProgramCode ?? "").trim() || DEFAULT_CHAIRMAN_PROGRAM_CODE;
  const programId =
    chairmanProgramId ??
    (programCodeForSummary.toUpperCase() === BSENVS_PROGRAM_CODE.toUpperCase() ? BSENVS_PROGRAM_ID : "prog-bsit");

  const loadCatalog = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoadError("Supabase is not configured.");
      return;
    }
    setLoadError(null);
    const [{ data: sec }, { data: prog }, { data: sub }, { data: rm }, { data: users }] = await Promise.all([
      supabase.from("Section").select(Q.section).order("name"),
      supabase.from("Program").select("id,collegeId").order("name"),
      supabase.from("Subject").select(Q.subject).order("code"),
      supabase.from("Room").select(Q.room).order("code"),
      supabase.from("User").select(Q.userChairmanScope),
    ]);
    setSections((sec ?? []) as Section[]);
    setProgramsCatalog((prog ?? []) as Pick<Program, "id" | "collegeId">[]);
    setSubjects((sub ?? []) as Subject[]);
    setRooms((rm ?? []) as Room[]);
    const fac = (users ?? []).filter(
      (u) =>
        (u.role === "instructor" || u.role === "chairman_admin") &&
        (!chairmanCollegeId || u.collegeId === chairmanCollegeId),
    ) as User[];
    /** Merge so cross-college instructors already pulled from `ScheduleEntry` rows are not dropped on catalog refresh. */
    setDbInstructors((prev) => {
      const m = new Map(prev.map((u) => [u.id, u]));
      for (const u of fac) m.set(u.id, u);
      return [...m.values()].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    });
    const instructorIds = fac.map((u) => u.id);
    const { data: fp } =
      instructorIds.length > 0
        ? await supabase.from("FacultyProfile").select(Q.facultyProfilePolicy).in("userId", instructorIds)
        : { data: [] as FacultyProfile[] };
    setFacultyProfiles((prev) => {
      const m = new Map(prev.map((p) => [p.userId, p]));
      for (const p of (fp ?? []) as FacultyProfile[]) m.set(p.userId, p);
      return [...m.values()];
    });
  }, [chairmanCollegeId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

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

  /** Term rooms from DB (other colleges) so shared faculty can keep cross-college plots addressable in the grid. */
  const termEntryRoomIds = useMemo(() => {
    if (!academicPeriodId) return new Set<string>();
    return new Set(
      allTermScheduleEntries.filter((e) => e.academicPeriodId === academicPeriodId).map((e) => e.roomId),
    );
  }, [allTermScheduleEntries, academicPeriodId]);

  /**
   * All chairman programs (including BSIT): home college + shared (`collegeId` null) rooms, plus any room already
   * used this term on a visible row (cross-college assignments).
   */
  const roomsForEvaluatorGrid = useMemo((): Room[] => {
    const scoped = rooms.filter(
      (r) =>
        !r.collegeId ||
        !chairmanCollegeId ||
        r.collegeId === chairmanCollegeId ||
        termEntryRoomIds.has(r.id),
    );
    const sorted = [...scoped].sort((a, b) => {
      const ba = (a.building ?? "").localeCompare(b.building ?? "");
      if (ba !== 0) return ba;
      return a.code.localeCompare(b.code);
    });
    return sorted.length > 0 ? sorted : rooms;
  }, [rooms, chairmanCollegeId, termEntryRoomIds]);

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

  const buildingLabelsForGrid = useMemo(() => sortedBuildingLabels(roomsForEvaluatorGrid), [roomsForEvaluatorGrid]);

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
  const visibleRows = useMemo(() => {
    return selectedSectionId ? rows.filter((r) => r.sectionId === selectedSectionId) : rows;
  }, [rows, selectedSectionId]);

  const roomCodeById = useMemo(() => {
    const m = new Map<string, string>();
    roomsForEvaluatorGrid.forEach((r) => m.set(r.id, r.displayName?.trim() ? `${r.code} — ${r.displayName}` : r.code));
    return m;
  }, [roomsForEvaluatorGrid]);

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
      if (worksheetIds.has(e.id)) continue;
      const b = scheduleEntryToBlock(e);
      if (b) byId.set(e.id, b);
    }
    for (const row of rows) {
      const subj = row.subjectCode ? subjectFromProspectus(row.subjectCode, programId, programCodeForSummary) : undefined;
      let b: ScheduleBlock | null = subj ? rowToBlock(row, academicPeriodId, subj.id, programCodeForSummary) : null;
      if (!b) {
        const fromDb = allTermScheduleEntries.find((e) => e.id === row.id);
        if (fromDb && fromDb.academicPeriodId === academicPeriodId) b = scheduleEntryToBlock(fromDb);
      }
      if (b) byId.set(row.id, b);
    }
    return [...byId.values()];
  }, [allTermScheduleEntries, academicPeriodId, rows, programId, programCodeForSummary]);

  /**
   * Campus-wide sparse blocks (every program’s saved rows + this worksheet’s drafts) for real-time cells and
   * “Run conflict check”. Plotting UI stays program-scoped; overlap detection must not ignore other programs.
   */
  const sparseCampusUniverse = useMemo((): SparseScheduleBlock[] => {
    return mergedBlocksForCampusScan.map(scheduleBlockToSparseBlock);
  }, [mergedBlocksForCampusScan]);

  const conflictForRow = useCallback(
    (row: PlotRow): { faculty: string; room: string; section: string } => {
      if (!academicPeriodId) return { faculty: "—", room: "—", section: "—" };
      const candidate = rowToSparseBlock(row, academicPeriodId, programCodeForSummary);
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
    [academicPeriodId, sparseCampusUniverse, programCodeForSummary],
  );

  const runCampusConflictCheck = useCallback(async () => {
    if (!academicPeriodId) return;
    setSaveScheduleMsg(null);
    setChairmanEnrichedIssues([]);
    setChairmanGaByIssueKey({});
    const scan = scanAllSparseScheduleConflicts(sparseCampusUniverse);
    setCampusScanConflictIds(new Set(scan.conflictingEntryIds));
    if (scan.issueSummaries.length === 0) {
      setSaveScheduleMsg(
        "No conflicts — faculty, room, and section times are clear campus-wide for this term (all programs).",
      );
    } else {
      setSaveScheduleMsg(
        `Campus-wide scan: ${scan.conflictingEntryIds.size} schedule row(s) have overlapping faculty, room, or section assignments. Open details below.`,
      );
    }
    setConflictDetailLoading(true);
    try {
      /**
       * Build conflict detail + GA alternatives locally so the UI always shows solutions immediately after a scan,
       * without depending on an extra API call.
       */
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

      for (const raw of scan.issues) {
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
          const sug = runRuleBasedGeneticAlgorithm({
            universe: mergedBlocksForCampusScan,
            sectionId,
            subjectId,
            academicPeriodId,
            excludeEntryId: block?.id,
            roomIds,
            instructorIds,
            generations: 28,
            populationSize: 44,
          });
          gaMap[iss.key] = sug.slice(0, 5);
        }
      }
      setChairmanGaByIssueKey(gaMap);
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
    });
  }, [academicPeriodId, allTermScheduleEntries, rows, programId, programCodeForSummary]);

  const policyRows = useMemo(() => {
    if (!academicPeriodId || !chairmanCollegeId) {
      return { hasAnyViolation: false, rows: [] as ReturnType<typeof evaluateFacultyLoadsForCollege>["rows"] };
    }
    return evaluateFacultyLoadsForCollege(
      mergedEntriesForCollegePolicy,
      subjectByIdForPolicy,
      userById,
      profileByUserId,
      chairmanCollegeId,
      (sid) => sectionToCollegeId(sid),
    );
  }, [
    mergedEntriesForCollegePolicy,
    academicPeriodId,
    chairmanCollegeId,
    subjectByIdForPolicy,
    userById,
    profileByUserId,
    sectionToCollegeId,
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

  const showJustification = policyRows.hasAnyViolation;

  /** Persists overload explanation to `ScheduleLoadJustification` (same table as Central Hub Evaluator). */
  const saveLoadJustificationForDoi = useCallback(
    async (rowsSnapshot?: PlotRow[]) => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !academicPeriodId || !chairmanCollegeId) {
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
    });
    const polJustif = evaluateFacultyLoadsForCollege(
      mergedForJustif,
      subjectByIdForPolicy,
      userById,
      profileByUserId,
      chairmanCollegeId,
      (sid) => sectionToCollegeId(sid),
    );
    if (!polJustif.hasAnyViolation) {
      setJustificationMsg("No load-policy violations detected; a justification is not required.");
      return false;
    }
    setJustificationSaving(true);
    setJustificationMsg(null);
    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr || !user) {
        setJustificationMsg("Not signed in.");
        return false;
      }
      const author = dbInstructors.find((u) => u.id === user.id);
      const authorName = author?.name ?? user.email ?? user.id;
      const violators = polJustif.rows.filter((r) => r.violations.length > 0);
      const snapRows = violators.map(
        (r) =>
          `${r.instructorName}: ${r.weeklyTotalContactHours.toFixed(1)} hrs/wk — ${r.violations.map((v) => v.code).join(", ")}`,
      );
      /** One VPAA review row per overloaded instructor; legacy college-wide row is removed when filing per-faculty. */
      await supabase
        .from("ScheduleLoadJustification")
        .delete()
        .eq("academicPeriodId", academicPeriodId)
        .eq("collegeId", chairmanCollegeId)
        .is("facultyUserId", null);
      for (const v of violators) {
        const plottedForFaculty = rowsForJustif.filter(
          (r) => r.instructorId === v.instructorId && rowFullyPlotted(r, programCodeForSummary),
        );
        const scheduleEntryId = plottedForFaculty[0]?.id ?? null;
        await supabase
          .from("ScheduleLoadJustification")
          .delete()
          .eq("academicPeriodId", academicPeriodId)
          .eq("collegeId", chairmanCollegeId)
          .eq("facultyUserId", v.instructorId);
        const { error: jErr } = await supabase.from("ScheduleLoadJustification").insert({
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
          doiDecision: null,
          doiReviewedAt: null,
          doiReviewedById: null,
          doiReviewNote: null,
        });
        if (jErr) {
          setJustificationMsg(jErr.message);
          return false;
        }
      }
      dispatchInsCatalogReload();
      void fetch("/api/audit/schedule-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chairman.policy_justification_upsert",
          collegeId: chairmanCollegeId,
          academicPeriodId,
          details: { source: "bsit_evaluator_worksheet" },
        }),
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
  ],
);

  function computePatchedPlotRow(row: PlotRow, patch: Partial<PlotRow>): PlotRow {
    const next = { ...row, ...patch };
    const p = next.subjectCode ? prospectusRowForProgram(programCodeForSummary, next.subjectCode) : undefined;
    if (p) {
      const d = scheduleDurationSlots(p);
      const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - d;
      if (next.startSlotIndex > maxS) return { ...next, startSlotIndex: maxS };
    }
    return next;
  }

  /** Low-level row update (no policy gate) — use for fields that do not affect contact hours. */
  function updateRow(id: string, patch: Partial<PlotRow>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (r.lockedByDoiAt) return r;
        return computePatchedPlotRow(r, patch);
      }),
    );
  }

  /**
   * Before applying instructor/day/slot/subject/room changes on a fully plotted row, ensure overload policy:
   * if the hypothetical campus-wide load violates caps, require justification (same modal as Save).
   */
  function commitRowPatch(id: string, patch: Partial<PlotRow>) {
    const row = rows.find((r) => r.id === id);
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
      const hypotheticalRows = rows.map((r) => (r.id === id ? candidate : r));
      const merged = buildWorksheetPolicyScheduleEntries({
        rows: hypotheticalRows,
        allTermScheduleEntries,
        academicPeriodId,
        programId,
        programCodeForSummary,
      });
      const pol = evaluateFacultyLoadsForCollege(
        merged,
        subjectByIdForPolicy,
        userById,
        profileByUserId,
        chairmanCollegeId,
        (sid) => sectionToCollegeId(sid),
      );
      const hit = pol.rows.find(
        (x) => x.instructorId === candidate.instructorId && x.violations.length > 0,
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

  function addRow() {
    if (addRowBusy) return;
    setAddRowBusy(true);
    toast.info("Adding schedule…");
    setRows((prev) => {
      if (prev.some((r) => Boolean(r.lockedByDoiAt))) return prev;
      const base = emptyRow();
      /** UX: if the user selected a section filter, prefill it for new rows. */
      const next = selectedSectionId ? { ...base, sectionId: selectedSectionId } : base;
      return [...prev, next];
    });
    window.setTimeout(() => setAddRowBusy(false), 450);
  }

  function removeRow(id: string) {
    setRows((prev) => {
      if (prev.some((r) => r.id === id && r.lockedByDoiAt)) return prev;
      return prev.filter((r) => r.id !== id);
    });
  }

  useEffect(() => {
    didHydrateFromDbRef.current = false;
    lastSyncedRowIdsRef.current = new Set();
    setRows([]);
  }, [academicPeriodId]);

  const loadRowsFromSupabase = useCallback(async () => {
    if (!academicPeriodId) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setLoadError(null);

    const { data: sch, error } = await supabase
      .from("ScheduleEntry")
      .select(
        "id,academicPeriodId,subjectId,instructorId,sectionId,roomId,day,startTime,endTime,status,lockedByDoiAt",
      )
      .eq("academicPeriodId", academicPeriodId);
    if (error) {
      setLoadError(error.message);
      return;
    }
    const entries = (sch ?? []) as ScheduleEntry[];
    setAllTermScheduleEntries(entries);

    const instrIds = [...new Set(entries.map((e) => e.instructorId).filter(Boolean))] as string[];
    if (instrIds.length > 0) {
      const { data: schedUsers } = await supabase.from("User").select(Q.userChairmanScope).in("id", instrIds);
      const rowFac = ((schedUsers ?? []) as User[]).filter(
        (u) => u.role === "instructor" || u.role === "chairman_admin",
      );
      setDbInstructors((prev) => {
        const m = new Map(prev.map((u) => [u.id, u]));
        for (const u of rowFac) m.set(u.id, u);
        return [...m.values()].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
      });
      if (rowFac.length > 0) {
        const { data: fpX } = await supabase
          .from("FacultyProfile")
          .select(Q.facultyProfilePolicy)
          .in("userId", rowFac.map((u) => u.id));
        setFacultyProfiles((prev) => {
          const m = new Map(prev.map((p) => [p.userId, p]));
          for (const p of (fpX ?? []) as FacultyProfile[]) m.set(p.userId, p);
          return [...m.values()];
        });
      }
    }

    const relevant =
      programSectionIdSet.size === 0
        ? []
        : entries.filter((e) => programSectionIdSet.has(e.sectionId));

    lockedEntryIdsRef.current = new Set(
      relevant.filter((e) => Boolean(e.lockedByDoiAt)).map((e) => e.id),
    );

    const slotIndexByStartTime = new Map<string, number>();
    for (let i = 0; i < BSIT_EVALUATOR_TIME_SLOTS.length; i++) {
      const t = BSIT_EVALUATOR_TIME_SLOTS[i];
      if (t) {
        slotIndexByStartTime.set(t.startTime, i);
        slotIndexByStartTime.set(normalizeSlotHHMM(t.startTime), i);
      }
    }

    const nextRows: PlotRow[] = relevant.map((e) => {
      const normStart = normalizeSlotHHMM(e.startTime);
      const slotIdx = slotIndexByStartTime.get(normStart) ?? slotIndexByStartTime.get(e.startTime) ?? startSlotIndexFromScheduleEntryStartTime(e.startTime);
      return {
        id: e.id,
        sectionId: e.sectionId,
        students: "",
        subjectCode: subjectCodeById.get(e.subjectId) ?? "",
        instructorId: e.instructorId,
        roomId: e.roomId,
        startSlotIndex: slotIdx,
        day: normalizeScheduleEntryDayForEvaluator(e.day),
        lockedByDoiAt: e.lockedByDoiAt ?? null,
      };
    });

    didHydrateFromDbRef.current = true;
    lastSyncedRowIdsRef.current = new Set(nextRows.map((r) => r.id));
    /** Cross-reload replays full DB rows; keep client-only draft rows until they are persisted (prevents “row disappears”). */
    setRows((prev) => {
      const dbIds = new Set(nextRows.map((r) => r.id));
      const pending = prev.filter((r) => !dbIds.has(r.id) && !r.lockedByDoiAt);
      const guard = postPersistUiMergeRef.current;
      const now = Date.now();
      const mergedDb = nextRows.map((nr) => {
        if (guard && now < guard.until && guard.ids.has(nr.id)) {
          const local = prev.find((p) => p.id === nr.id);
          if (local && !local.lockedByDoiAt) {
            return { ...nr, day: local.day, startSlotIndex: local.startSlotIndex };
          }
        }
        return nr;
      });
      return [...mergedDb, ...pending];
    });

    if (chairmanCollegeId) {
      const { data: ljRows } = await supabase
        .from("ScheduleLoadJustification")
        .select(Q.scheduleLoadJustification)
        .eq("academicPeriodId", academicPeriodId)
        .eq("collegeId", chairmanCollegeId)
        .order("updatedAt", { ascending: false })
        .limit(1);
      const lj = (ljRows ?? [])[0] as ScheduleLoadJustification | undefined;
      setJustificationText(lj?.justification ?? "");
    } else {
      setJustificationText("");
    }
  }, [academicPeriodId, programSectionIdSet, subjectCodeById, chairmanCollegeId]);

  useEffect(() => {
    void loadRowsFromSupabase();
  }, [loadRowsFromSupabase]);

  const reloadScheduleFromDb = useCallback(async () => {
    await loadCatalog();
    await loadRowsFromSupabase();
  }, [loadCatalog, loadRowsFromSupabase]);

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
        const supabase = createSupabaseBrowserClient();
        if (!supabase) return;
        const pad = (t: string) => (t.trim().length <= 5 ? `${t.trim()}:00` : t.trim());
        const { error } = await supabase
          .from("ScheduleEntry")
          .update({
            day: s.day,
            startTime: pad(s.startTime),
            endTime: pad(s.endTime),
            roomId: s.roomId,
            instructorId: s.instructorId,
          })
          .eq("id", iss.rowA.entryId);
        if (error) throw new Error(error.message);
        setChairmanEnrichedIssues([]);
        setChairmanGaByIssueKey({});
        setCampusScanConflictIds(new Set());
        await reloadScheduleFromDb();
        dispatchInsCatalogReload();
        void fetch("/api/audit/schedule-write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
                instructorId: s.instructorId,
              },
            },
          }),
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
        backup.rows.map((r) => ({
          id: r.id,
          sectionId: r.sectionId,
          students: r.students,
          subjectCode: r.subjectCode,
          instructorId: r.instructorId,
          roomId: r.roomId,
          startSlotIndex: r.startSlotIndex,
          day: r.day as BsitEvaluatorWeekday,
          lockedByDoiAt: null,
        })),
      );
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
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;
      /** Offline guard: queue for later sync (local backup already happens via snapshot). */
      if (source === "autosave" && typeof navigator !== "undefined" && navigator.onLine === false) {
        lastOfflineEditAtRef.current = Date.now();
        return;
      }
      if (source === "manual") {
        setSaveScheduleBusy(true);
        setSaveScheduleMsg(null);
      }
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
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
          const tb = rowTimeBounds(row, programCodeForSummary);
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
          });
        }

        const currentIds = new Set(rows.map((r) => r.id));
        const prevIds = lastSyncedRowIdsRef.current;
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

        if (removedIds.length > 0) {
          const { error: delErr } = await supabase.from("ScheduleEntry").delete().in("id", removedIds);
          if (delErr) {
            setLoadError(delErr.message);
            if (source === "manual") setSaveScheduleMsg(delErr.message);
            if (source === "manual") toast.error("Failed to save. Please try again.", delErr.message);
            return;
          }
        }

        if (upserts.length > 0) {
          const { error: upErr } = await supabase.from("ScheduleEntry").upsert(upserts, { onConflict: "id" });
          if (upErr) {
            setLoadError(upErr.message);
            if (source === "manual") setSaveScheduleMsg(upErr.message);
            if (source === "manual") toast.error("Failed to save. Please try again.", upErr.message);
            return;
          }
        }

        const wrote = upserts.length > 0 || removedIds.length > 0;
        if (!wrote) {
          showSkippedMsg("none_saved");
        }
        if (wrote) {
          postPersistUiMergeRef.current = {
            until: Date.now() + 3200,
            ids: new Set(upserts.map((u) => u.id)),
          };
          window.setTimeout(() => {
            const g = postPersistUiMergeRef.current;
            if (g && Date.now() >= g.until) postPersistUiMergeRef.current = null;
          }, 3300);
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
          /** INS forms subscribe to this event via `useInsCatalog` — immediate refresh for all viewers. */
          dispatchInsCatalogReload();
          if (source === "manual") {
            void fetch("/api/audit/schedule-write", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "chairman.evaluator_save",
                collegeId: chairmanCollegeId,
                academicPeriodId,
                details: {
                  upsertCount: upserts.length,
                  deleteCount: removedIds.length,
                  rows: auditRows,
                },
              }),
            });
          }
        }

        lastSyncedRowIdsRef.current = new Set(rows.map((r) => r.id));

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
    [rows, academicPeriodId, subjectIdByCode, chairmanCollegeId, sectionNameById, toast, programCodeForSummary],
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

      <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-black/75">
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

      {/* Plotting grid: actions above the scroll area (parity with GEC hub). */}
      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden border border-black/10">
        <div className="px-4 py-3 border-b border-black/10 bg-black/[0.02] flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-bold text-black/90">Evaluator plotting grid</h3>
            <p className="text-[11px] text-black/55 mt-0.5">
              Real-time conflict cells use a <strong>campus-wide</strong> timetable (all programs). Run the scan to
              highlight conflicting rows in this worksheet.
            </p>
            <p className="text-[11px] text-black/60 leading-relaxed">
              Pick instructors by <strong>full name</strong> (from Faculty Profile). Rows store{" "}
              <code className="text-[10px] bg-black/[0.04] px-1 rounded">User.id</code>; when the instructor
              self-registers with Gmail using the same Employee ID, plots attach to their account automatically.
            </p>
            {instructorPlotOptions.length === 0 ? (
              <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No instructors with an Employee ID in this college. Add faculty in <strong>Faculty Profile</strong> and
                set their Employee ID before plotting.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold disabled:opacity-50 disabled:pointer-events-none shrink-0"
              disabled={schedulePublished || addRowBusy}
              onClick={addRow}
            >
              {addRowBusy ? "Adding…" : "+ Add schedule row"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-amber-300 bg-white font-bold shrink-0 h-9 text-xs"
              disabled={schedulePublished || !academicPeriodId || mergedBlocksForCampusScan.length === 0}
              onClick={() => void runCampusConflictCheck()}
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5 inline" aria-hidden />
              Run conflict check
            </Button>
            <Button
              type="button"
              className="bg-[#780301] hover:bg-[#5a0201] text-white font-bold shrink-0 h-9 text-xs disabled:opacity-50"
              disabled={schedulePublished || saveScheduleBusy}
              onClick={() => {
                if (autosaveTimerRef.current) {
                  clearTimeout(autosaveTimerRef.current);
                  autosaveTimerRef.current = null;
                }
                if (policyRows.hasAnyViolation) {
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
              }}
            >
              <Save className="w-3.5 h-3.5 mr-1.5 inline" aria-hidden />
              {saveScheduleBusy ? "Saving…" : "Save schedule"}
            </Button>
            <div className="ml-auto flex flex-col items-end gap-0.5 text-[10px] text-black/55 min-w-[200px]">
              <span className="font-semibold text-black/70">
                {connOnline ? (
                  <span className="text-emerald-800">Online</span>
                ) : (
                  <span className="text-red-800">Offline</span>
                )}
                <span className="text-black/45 font-normal"> · Autosave ~9s</span>
              </span>
              <span className="tabular-nums">
                {lastDraftSaveAt
                  ? `Last draft sync: ${lastDraftSaveAt.toLocaleTimeString()}`
                  : "Last draft sync: —"}
              </span>
            </div>
          </div>
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
        </div>
          <div className="max-h-[min(70vh,880px)] overflow-auto">
          <div className="overflow-x-auto min-h-0">
          <table className="w-full border-collapse min-w-[1100px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#ff990a] text-white text-[11px]">
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Major</th>
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Section</th>
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Students</th>
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Subject code</th>
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Lec</th>
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Lab</th>
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Instructor</th>
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Building / Room</th>
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Time</th>
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Day</th>
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Faculty conflict</th>
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Room conflict</th>
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Section conflict</th>
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold w-14"> </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-[13px] text-black/50">
                    {selectedSectionId
                      ? "No schedule rows for this section yet. Click “Add schedule row” to start plotting."
                      : "No rows yet. Click “Add schedule row” to plot sections (Mon–Fri, 7:00 AM–5:00 PM)."}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, i) => {
                  const pr = row.subjectCode ? prospectusRowForProgram(programCodeForSummary, row.subjectCode) : undefined;
                  const dur = pr ? scheduleDurationSlots(pr) : 1;
                  const maxStart = BSIT_EVALUATOR_TIME_SLOTS.length - dur;
                  const effectiveStart = Math.min(row.startSlotIndex, maxStart);
                  const sectionName = row.sectionId ? (sectionNameById.get(row.sectionId) ?? "") : "";
                  const yearLevel = sectionName ? yearLevelFromSchedulingSectionName(sectionName) : null;
                  const subjectOptions =
                    yearLevel == null
                      ? []
                      : termProspectusSemester != null
                        ? prospectusSubjectsForProgramYearAndSemester(
                            programCodeForSummary,
                            yearLevel,
                            termProspectusSemester,
                          )
                        : prospectusSubjectsForProgramYearLevel(programCodeForSummary, yearLevel);
                  const cf = conflictForRow(row);
                  const timeFmt = formatTimeRangeFromSlots(effectiveStart, dur);
                  const rowReadOnly = schedulePublished || Boolean(row.lockedByDoiAt);
                  const conflictHighlight = campusScanConflictIds.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      id={`chairman-eval-row-${row.id}`}
                      className={`text-[11px] ${
                        conflictHighlight
                          ? "bg-red-50/90 ring-2 ring-red-300/80"
                          : i % 2 === 0
                            ? "bg-white"
                            : "bg-black/[0.02]"
                      }`}
                    >
                      <td className="border border-black/10 px-2 py-1.5 font-semibold text-black/80">
                        {programCodeForSummary}
                      </td>
                      <td className="border border-black/10 px-1 py-1">
                        <select
                          className={selectClass}
                          value={row.sectionId}
                          disabled={rowReadOnly}
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
                          <option value="">Select…</option>
                          {programSections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-black/10 px-1 py-1 w-20">
                        <input
                          type="number"
                          min={0}
                          className={`${selectClass} tabular-nums`}
                          disabled={rowReadOnly}
                          value={row.students === "" ? "" : row.students}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateRow(row.id, { students: v === "" ? "" : Math.max(0, parseInt(v, 10) || 0) });
                          }}
                          placeholder="0"
                        />
                      </td>
                      <td className="border border-black/10 px-1 py-1 min-w-[120px]">
                        <select
                          className={selectClass}
                          value={row.subjectCode}
                          disabled={rowReadOnly || !row.sectionId || yearLevel == null}
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
                          <option value="">{!row.sectionId ? "Select section first…" : "Select…"}</option>
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
                                {available.length > 0 ? (
                                  <optgroup label="Available">
                                    {available.map((s) => (
                                      <option key={s.code} value={s.code}>
                                        {s.code} — {s.title}
                                      </option>
                                    ))}
                                  </optgroup>
                                ) : null}
                                {already.length > 0 ? (
                                  <optgroup label="Already scheduled (read-only)">
                                    {already.map((s) => (
                                      <option key={s.code} value={s.code} disabled>
                                        ✓ {s.code} — {s.title}
                                      </option>
                                    ))}
                                  </optgroup>
                                ) : null}
                              </>
                            );
                          })()}
                        </select>
                      </td>
                      <td className="border border-black/10 px-2 py-1.5 tabular-nums text-black/80">
                        {pr ? `${pr.lecUnits}u / ${pr.lecHours}h` : "—"}
                      </td>
                      <td className="border border-black/10 px-2 py-1.5 tabular-nums text-black/80">
                        {pr ? `${pr.labUnits}u / ${pr.labHours}h` : "—"}
                      </td>
                      <td className="border border-black/10 px-1 py-1 min-w-[140px]">
                        <select
                          className={selectClass}
                          value={row.instructorId}
                          disabled={rowReadOnly}
                          onChange={(e) => commitRowPatch(row.id, { instructorId: e.target.value })}
                          aria-label="Instructor"
                        >
                          <option value="">Select instructor…</option>
                          {instructorPlotOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {formatInstructorPlotOptionLabel(opt)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-black/10 px-1 py-1 align-top">
                        {(() => {
                          const pickedRoom = row.roomId ? roomById.get(row.roomId) : undefined;
                          const inferredBuilding = pickedRoom ? roomBuildingKey(pickedRoom) : "";
                          const buildingValue = roomBuildingByRowId[row.id] ?? inferredBuilding;
                          const roomsInB = buildingValue
                            ? roomsInBuilding(roomsForEvaluatorGrid, buildingValue)
                            : [];
                          return (
                            <div className="flex flex-col gap-1 min-w-[128px]">
                              <select
                                className={selectClass}
                                value={buildingValue}
                                disabled={rowReadOnly}
                                aria-label="Building"
                                onChange={(e) => {
                                  const b = e.target.value;
                                  setRoomBuildingByRowId((prev) => {
                                    const next = { ...prev };
                                    if (!b) delete next[row.id];
                                    else next[row.id] = b;
                                    return next;
                                  });
                                  if (!b) {
                                    commitRowPatch(row.id, { roomId: "" });
                                    return;
                                  }
                                  const keep =
                                    row.roomId &&
                                    roomsForEvaluatorGrid.some(
                                      (r) => r.id === row.roomId && roomBuildingKey(r) === b,
                                    );
                                  if (!keep) commitRowPatch(row.id, { roomId: "" });
                                }}
                              >
                                <option value="">Building…</option>
                                {buildingLabelsForGrid.map((b) => (
                                  <option key={b} value={b}>
                                    {b}
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
                                <option value="">{buildingValue ? "Room…" : "Select building first"}</option>
                                {roomsInB.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.displayName?.trim() ? `${r.code} — ${r.displayName}` : r.code}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="border border-black/10 px-1 py-1 min-w-[200px] align-top">
                        <div className="flex flex-col gap-1">
                          {pr ? (
                            <>
                              <div className="text-[12px] font-bold text-black leading-snug">{timeFmt.fullLine}</div>
                              {dur > 1 ? (
                                <ul className="text-[9px] text-black/75 border border-black/15 rounded-md bg-black/[0.02] px-1.5 py-1 space-y-0.5 tabular-nums">
                                  {timeFmt.slotLines.map((line, li) => (
                                    <li key={`${effectiveStart}-${li}-${line}`}>{line}</li>
                                  ))}
                                </ul>
                              ) : null}
                              <span className="text-[9px] font-medium text-black/60">First hour (start)</span>
                            </>
                          ) : null}
                          <select
                            className={selectClass}
                            aria-label="First hour start slot"
                            value={effectiveStart}
                            disabled={rowReadOnly}
                            onChange={(e) => commitRowPatch(row.id, { startSlotIndex: parseInt(e.target.value, 10) })}
                          >
                            {BSIT_EVALUATOR_TIME_SLOTS.slice(0, maxStart + 1).map((t, idx) => (
                              <option key={`${idx}-${t.label}`} value={idx}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          {pr ? (
                            <span className="text-[9px] text-black/45">
                              {dur}h from prospectus · {pr.labUnits > 0 ? `${pr.labUnits} lab unit(s)` : "lecture"}
                            </span>
                          ) : (
                            <span className="text-[9px] text-black/45">Select subject for duration</span>
                          )}
                        </div>
                      </td>
                      <td className="border border-black/10 px-1 py-1">
                        <select
                          className={selectClass}
                          value={row.day}
                          disabled={rowReadOnly}
                          onChange={(e) => commitRowPatch(row.id, { day: e.target.value as BsitEvaluatorWeekday })}
                        >
                          {BSIT_EVALUATOR_WEEKDAYS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td
                        className={`border border-black/10 px-2 py-1.5 font-semibold ${
                          cf.faculty === "Yes"
                            ? "text-red-700 bg-red-50"
                            : cf.faculty === "—"
                              ? "text-black/45 bg-black/[0.02]"
                              : "text-green-800"
                        }`}
                      >
                        {cf.faculty}
                      </td>
                      <td
                        className={`border border-black/10 px-2 py-1.5 font-semibold ${
                          cf.room === "Yes"
                            ? "text-red-700 bg-red-50"
                            : cf.room === "—"
                              ? "text-black/45 bg-black/[0.02]"
                              : "text-green-800"
                        }`}
                      >
                        {cf.room}
                      </td>
                      <td
                        className={`border border-black/10 px-2 py-1.5 font-semibold ${
                          cf.section === "Yes"
                            ? "text-red-700 bg-red-50"
                            : cf.section === "—"
                              ? "text-black/45 bg-black/[0.02]"
                              : "text-green-800"
                        }`}
                      >
                        {cf.section}
                      </td>
                      <td className="border border-black/10 px-1 py-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-[10px]"
                          disabled={rowReadOnly}
                          onClick={() => removeRow(row.id)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <BsitWeekPreview
        rows={rows}
        programCodeForSummary={programCodeForSummary}
        sectionNameById={sectionNameById}
        roomCodeById={roomCodeById}
        instructorDisplayById={instructorDisplayById}
        selectedSectionId={selectedSectionId}
      />

      {showJustification ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-2">
          <div className="text-[14px] font-semibold text-amber-950">Justification (DOI / VPAA review)</div>
          <p className="text-[12px] text-amber-950/85 leading-relaxed">
            Faculty load rules are exceeded for this draft ({FACULTY_POLICY_CONSTANTS.STANDARD_WEEKLY_TEACHING_HOURS}{" "}
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

function BsitWeekPreview({
  rows,
  programCodeForSummary,
  sectionNameById,
  roomCodeById,
  instructorDisplayById,
  selectedSectionId,
}: {
  rows: PlotRow[];
  programCodeForSummary: string;
  sectionNameById: Map<string, string>;
  roomCodeById: Map<string, string>;
  instructorDisplayById: Map<string, string>;
  selectedSectionId: string;
}) {
  const slots = BSIT_EVALUATOR_TIME_SLOTS;
  const filteredRows = useMemo(
    () => (selectedSectionId ? rows.filter((r) => r.sectionId === selectedSectionId) : rows),
    [rows, selectedSectionId],
  );
  const skipSlot = useMemo(() => {
    const m = new Set<string>();
    for (const row of filteredRows) {
      const p = row.subjectCode ? prospectusRowForProgram(programCodeForSummary, row.subjectCode) : undefined;
      if (!row.sectionId || !row.subjectCode || !p) continue;
      const dur = scheduleDurationSlots(p);
      const maxS = slots.length - dur;
      const start = Math.min(row.startSlotIndex, maxS);
      for (let k = 1; k < dur; k++) {
        m.add(`${row.day}-${start + k}`);
      }
    }
    return m;
  }, [filteredRows, programCodeForSummary]);

  return (
    <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden border border-black/10 p-4">
      <div className="text-[15px] font-semibold text-black mb-1">Schedule preview (INS weekly grid)</div>
      <p className="text-[12px] text-black/55 mb-4">Monday–Friday · 7:00 AM–5:00 PM · 1-hour slots · Plotted rows only</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr>
              <th className="border border-black bg-white px-1 py-1 w-[72px] font-bold text-black">TIME</th>
              {BSIT_EVALUATOR_WEEKDAYS.map((day) => (
                <th key={day} className="border border-black bg-white px-1 py-1 min-w-[100px] font-bold text-black">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, slotIdx) => (
              <tr key={slot.label}>
                <td className="border border-black px-1 py-1.5 text-center whitespace-nowrap text-black">{slot.label}</td>
                {BSIT_EVALUATOR_WEEKDAYS.map((day) => {
                  if (skipSlot.has(`${day}-${slotIdx}`)) return null;
                  const atHere = filteredRows.filter((r) => {
                    const p = r.subjectCode ? prospectusRowForProgram(programCodeForSummary, r.subjectCode) : undefined;
                    if (!r.sectionId || !r.subjectCode || !p) return false;
                    const dur = scheduleDurationSlots(p);
                    const maxS = slots.length - dur;
                    const start = Math.min(r.startSlotIndex, maxS);
                    return r.day === day && start === slotIdx;
                  });
                  if (atHere.length === 0) {
                    return (
                      <td key={day} className="border border-black px-1 py-1 align-top text-black">
                        <span className="text-black/25">—</span>
                      </td>
                    );
                  }
                  const rowspan = Math.max(
                    ...atHere.map((r) => {
                      const p = prospectusRowForProgram(programCodeForSummary, r.subjectCode);
                      return p ? scheduleDurationSlots(p) : 1;
                    }),
                  );
                  return (
                    <td key={day} rowSpan={rowspan} className="border border-black px-1 py-1 align-top text-black">
                      <ul className="space-y-1">
                        {atHere.map((r) => {
                          const sec = sectionNameById.get(r.sectionId) ?? r.sectionId;
                          const room = roomCodeById.get(r.roomId) ?? "";
                          const inst = instructorDisplayById.get(r.instructorId) ?? "";
                          const p = prospectusRowForProgram(programCodeForSummary, r.subjectCode);
                          const dur = p ? scheduleDurationSlots(p) : 1;
                          const maxS = p ? slots.length - dur : 0;
                          const eff = p ? Math.min(r.startSlotIndex, maxS) : 0;
                          return (
                            <li key={r.id} className="leading-tight">
                              <span className="font-semibold">{r.subjectCode}</span>
                              <span className="block text-[9px] text-black/60 font-medium">{formatTimeRangeFromSlots(eff, dur).fullLine}</span>
                              <span className="block text-[9px] text-black/70">{sec}</span>
                              <span className="block text-[9px] text-black/60">{room}</span>
                              <span className="block text-[9px] text-black/60">{inst}</span>
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
    </div>
  );
}
