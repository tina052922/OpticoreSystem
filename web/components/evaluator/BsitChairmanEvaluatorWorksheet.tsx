"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Q } from "@/lib/supabase/catalog-columns";
import { detectConflictsSparse, scanAllSparseScheduleConflicts } from "@/lib/scheduling/conflicts";
import type { SparseScheduleBlock } from "@/lib/scheduling/conflicts";
import { evaluateFacultyLoadsForCollege } from "@/lib/scheduling/facultyPolicies";
import type { GASuggestion, ScheduleBlock } from "@/lib/scheduling/types";
import { runRuleBasedGeneticAlgorithm } from "@/lib/scheduling/ruleBasedGA";
import { formatGaSuggestionShortLabel } from "@/lib/scheduling/conflict-suggestion-label";
import type { FacultyProfile, Room, ScheduleEntry, ScheduleLoadJustification, Section, Subject, User } from "@/types/db";
import { AlertTriangle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BSIT_PROSPECTUS_SUBJECTS,
  BSIT_SCHEDULING_ROOM_CODES,
  normalizeProspectusCode,
  prospectusByCode,
  prospectusSubjectsForYearAndSemester,
  prospectusSubjectsForYearLevel,
  scheduleDurationSlots,
  yearLevelFromBsitSectionName,
} from "@/lib/chairman/bsit-prospectus";
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

const MAJOR_FIXED = "BSIT";

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

/** Build a Subject-shaped object for faculty policy evaluation from prospectus row. */
function subjectFromProspectus(code: string, programId: string): Subject | undefined {
  const p = prospectusByCode(code);
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

function rowTimeBounds(row: PlotRow): { startIdx: number; start: (typeof BSIT_EVALUATOR_TIME_SLOTS)[0]; endSlot: (typeof BSIT_EVALUATOR_TIME_SLOTS)[0] } | null {
  const p = row.subjectCode ? prospectusByCode(row.subjectCode) : undefined;
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
function rowToSparseBlock(row: PlotRow, academicPeriodId: string): SparseScheduleBlock | null {
  if (!academicPeriodId || !row.day) return null;
  const t = rowTimeBounds(row);
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

function rowToBlock(row: PlotRow, academicPeriodId: string, subjectIdForRow: string): ScheduleBlock | null {
  if (!row.sectionId || !row.instructorId || !row.roomId || !row.subjectCode) return null;
  const p = prospectusByCode(row.subjectCode);
  if (!p) return null;
  const t = rowTimeBounds(row);
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

/** Normalize DB time strings for sparse overlap checks (matches GEC `GecSectionPlottingTable`). */
function hhmmSchedule(t: string): string {
  const s = t.trim();
  return s.length > 5 ? s.slice(0, 5) : s;
}

/** Supabase row → sparse block for campus-wide conflict universe (all programs / sections / rooms / faculty). */
function scheduleEntryToSparse(e: ScheduleEntry): SparseScheduleBlock | null {
  if (!e.academicPeriodId) return null;
  return {
    id: e.id,
    academicPeriodId: e.academicPeriodId,
    day: e.day,
    startTime: hhmmSchedule(e.startTime),
    endTime: hhmmSchedule(e.endTime),
    instructorId: e.instructorId,
    sectionId: e.sectionId,
    roomId: e.roomId,
  };
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

function rowFullyPlotted(row: PlotRow): boolean {
  if (!row.sectionId || !row.subjectCode || !row.instructorId || !row.roomId) return false;
  return rowTimeBounds(row) != null;
}

/**
 * Same bar as {@link BsitWeekPreview}: a class appears in the weekly grid when section, prospectus subject, day, and
 * start slot are set. Instructor/room are optional for rendering the cell — the summary “Plotted” badge must follow
 * this so it stays in sync with the preview (autosave to DB may still wait for full resource fields).
 */
function rowVisibleInSchedulePreview(row: PlotRow): boolean {
  if (!row.sectionId || !row.subjectCode) return false;
  if (!prospectusByCode(row.subjectCode)) return false;
  return rowTimeBounds(row) != null;
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
  const lastSyncedRowIdsRef = useRef<Set<string>>(new Set());
  /** IDs loaded with `lockedByDoiAt` — never send DELETE for these if they disappear from state (e.g. scope change). */
  const lockedEntryIdsRef = useRef<Set<string>>(new Set());
  const didHydrateFromDbRef = useRef(false);

  const programId = chairmanProgramId ?? "prog-bsit";
  /** Prospectus registry key — aligns with `Program.code` in Supabase (e.g. BSIT). */
  const programCodeForSummary = (chairmanProgramCode ?? "").trim() || MAJOR_FIXED;

  const loadCatalog = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoadError("Supabase is not configured.");
      return;
    }
    setLoadError(null);
    const [{ data: sec }, { data: sub }, { data: rm }, { data: users }] = await Promise.all([
      supabase.from("Section").select(Q.section).order("name"),
      supabase.from("Subject").select(Q.subject).order("code"),
      supabase.from("Room").select(Q.room).order("code"),
      supabase.from("User").select(Q.userChairmanScope),
    ]);
    setSections((sec ?? []) as Section[]);
    setSubjects((sub ?? []) as Subject[]);
    setRooms((rm ?? []) as Room[]);
    const fac = (users ?? []).filter(
      (u) =>
        (u.role === "instructor" || u.role === "chairman_admin") &&
        (!chairmanCollegeId || u.collegeId === chairmanCollegeId),
    ) as User[];
    setDbInstructors(fac);
    const instructorIds = fac.map((u) => u.id);
    const { data: fp } =
      instructorIds.length > 0
        ? await supabase.from("FacultyProfile").select(Q.facultyProfilePolicy).in("userId", instructorIds)
        : { data: [] as FacultyProfile[] };
    setFacultyProfiles((fp ?? []) as FacultyProfile[]);
  }, [chairmanCollegeId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  /**
   * All sections for this chairman program (same scope as INS Faculty/Section/Room via `useInsCatalog`).
   * Do not restrict to a hard-coded BSIT name list — DB section labels vary and extra rows were hidden from the grid.
   */
  const programSections = useMemo(
    () => sections.filter((s) => s.programId === programId).sort((a, b) => a.name.localeCompare(b.name)),
    [sections, programId],
  );

  const programSectionIdSet = useMemo(
    () => new Set(programSections.map((s) => s.id)),
    [programSections],
  );

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

  /** IT LAB 1–4 only; synthetic rows if DB has no matching rooms so the dropdown is never empty. */
  const itLabsWithFallback = useMemo((): Room[] => {
    const allow = new Set(BSIT_SCHEDULING_ROOM_CODES);
    const fromDb = rooms.filter((r) => allow.has(r.code.trim() as (typeof BSIT_SCHEDULING_ROOM_CODES)[number]));
    const byCode = new Map(fromDb.map((r) => [r.code.trim(), r]));
    return BSIT_SCHEDULING_ROOM_CODES.map((code, i) => {
      const existing = byCode.get(code);
      if (existing) return existing;
      return {
        id: `local-it-lab-${i + 1}`,
        code,
        building: null,
        floor: null,
        capacity: null,
        type: "lab",
        collegeId: chairmanCollegeId,
      };
    });
  }, [rooms, chairmanCollegeId]);

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
    for (const r of itLabsWithFallback) m.set(r.id, r);
    return m;
  }, [rooms, itLabsWithFallback]);

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
    return yearLevelFromBsitSectionName(name);
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
    itLabsWithFallback.forEach((r) => m.set(r.id, r.code));
    return m;
  }, [itLabsWithFallback]);

  const subjectById = useMemo(() => {
    const m = new Map<string, Subject>();
    for (const p of BSIT_PROSPECTUS_SUBJECTS) {
      const sub = subjectFromProspectus(p.code, programId);
      if (sub) m.set(sub.id, sub);
    }
    return m;
  }, [programId]);

  const profileByUserId = useMemo(() => {
    const m = new Map<string, FacultyProfile>();
    facultyProfiles.forEach((p) => m.set(p.userId, p));
    return m;
  }, [facultyProfiles]);

  /**
   * Program-scoped sparse universe (Program Chairman): all `ScheduleEntry` rows for the term that belong to
   * the chairman’s program, with worksheet rows overriding same ids.
   *
   * College Admin / GEC / DOI use campus-wide scans elsewhere; this worksheet is intentionally program-level
   * to match the Program Chairman role scope.
   */
  const sparseProgramUniverse = useMemo((): SparseScheduleBlock[] => {
    if (!academicPeriodId) return [];
    const worksheetIds = new Set(rows.map((r) => r.id));
    const byId = new Map<string, SparseScheduleBlock>();
    for (const e of allTermScheduleEntries) {
      if (e.academicPeriodId !== academicPeriodId) continue;
      if (!programSectionIdSet.has(e.sectionId)) continue;
      if (worksheetIds.has(e.id)) continue;
      const sp = scheduleEntryToSparse(e);
      if (sp) byId.set(e.id, sp);
    }
    for (const row of rows) {
      const b = rowToSparseBlock(row, academicPeriodId);
      if (b) byId.set(row.id, b);
    }
    return [...byId.values()];
  }, [allTermScheduleEntries, academicPeriodId, rows, programSectionIdSet]);

  const conflictForRow = useCallback(
    (row: PlotRow): { faculty: string; room: string; section: string } => {
      if (!academicPeriodId) return { faculty: "—", room: "—", section: "—" };
      const candidate = rowToSparseBlock(row, academicPeriodId);
      if (!candidate) return { faculty: "—", room: "—", section: "—" };
      const hits = detectConflictsSparse(candidate, sparseProgramUniverse, candidate.id);
      const fac = hits.some((h) => h.type === "faculty");
      const room = hits.some((h) => h.type === "room");
      const sec = hits.some((h) => h.type === "section");
      return {
        faculty: !candidate.instructorId ? "—" : fac ? "Yes" : "No",
        room: !candidate.roomId ? "—" : room ? "Yes" : "No",
        section: !candidate.sectionId ? "—" : sec ? "Yes" : "No",
      };
    },
    [academicPeriodId, sparseProgramUniverse],
  );

  /**
   * Subject codes that appear in the schedule preview for the selected section — drives the prospectus “Plotted”
   * column (must match {@link BsitWeekPreview} / {@link rowVisibleInSchedulePreview}, not DB-only “fully saved” rows).
   */
  const plottedSubjectCodesForSection = useMemo(() => {
    const set = new Set<string>();
    if (!selectedSectionId) return set;
    for (const row of rows) {
      if (row.sectionId !== selectedSectionId) continue;
      if (!rowVisibleInSchedulePreview(row)) continue;
      set.add(normalizeProspectusCode(row.subjectCode));
    }
    return set;
  }, [rows, selectedSectionId]);

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
      const p = r.subjectCode ? prospectusByCode(r.subjectCode) : undefined;
      if (!r.sectionId || !r.subjectCode || !p) continue;
      add(r.sectionId, r.subjectCode);
    }
    return m;
  }, [allTermScheduleEntries, academicPeriodId, programSectionIdSet, rows, subjectCodeById]);

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
      const subj = row.subjectCode ? subjectFromProspectus(row.subjectCode, programId) : undefined;
      let b: ScheduleBlock | null = subj ? rowToBlock(row, academicPeriodId, subj.id) : null;
      if (!b) {
        const fromDb = allTermScheduleEntries.find((e) => e.id === row.id);
        if (fromDb && fromDb.academicPeriodId === academicPeriodId) b = scheduleEntryToBlock(fromDb);
      }
      if (b) byId.set(row.id, b);
    }
    return [...byId.values()];
  }, [allTermScheduleEntries, academicPeriodId, rows, programId]);

  const runCampusConflictCheck = useCallback(async () => {
    if (!academicPeriodId) return;
    setSaveScheduleMsg(null);
    setChairmanEnrichedIssues([]);
    setChairmanGaByIssueKey({});
    const scan = scanAllSparseScheduleConflicts(sparseProgramUniverse);
    setCampusScanConflictIds(new Set(scan.conflictingEntryIds));
    if (scan.issueSummaries.length === 0) {
      setSaveScheduleMsg("No conflicts — faculty, room, and section times are clear within this program for this term.");
    } else {
      setSaveScheduleMsg(`Program scan: ${scan.conflictingEntryIds.size} row(s) involved in conflicts.`);
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
        const tb = rowTimeBounds(r);
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
        const rootCause =
          t === "room"
            ? `Room double-booking: ${rowA.where} has two classes at the same time. (A) ${rowA.what} · ${rowA.who} @ ${rowA.when} vs (B) ${rowB.what} · ${rowB.who} @ ${rowB.when}.`
            : t === "faculty"
              ? `Faculty double-booking: ${rowA.who} is scheduled for two classes at the same time. (A) ${rowA.what} @ ${rowA.when} in ${rowA.where} vs (B) ${rowB.what} @ ${rowB.when} in ${rowB.where}.`
              : `Section overlap: ${rowA.what.split("·")[1]?.trim() ?? "section"} has two different subjects at the same time. (A) ${rowA.what} @ ${rowA.when} in ${rowA.where} vs (B) ${rowB.what} @ ${rowB.when} in ${rowB.where}.`;
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
    sparseProgramUniverse,
    mergedBlocksForCampusScan,
    chairmanCollegeId,
    rooms,
    dbInstructors,
    roomById,
    sectionNameById,
    subjectCodeById,
    userById,
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

  const policyRows = useMemo(() => {
    if (!academicPeriodId || !chairmanCollegeId) {
      return { hasAnyViolation: false, rows: [] as ReturnType<typeof evaluateFacultyLoadsForCollege>["rows"] };
    }
    const entries: ScheduleEntry[] = [];
    for (const row of rows) {
      const subj = row.subjectCode ? subjectFromProspectus(row.subjectCode, programId) : undefined;
      if (!subj) continue;
      const b = rowToBlock(row, academicPeriodId, subj.id);
      if (!b) continue;
      entries.push({
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
      });
    }

    return evaluateFacultyLoadsForCollege(
      entries,
      subjectById,
      userById,
      profileByUserId,
      chairmanCollegeId,
      () => chairmanCollegeId,
    );
  }, [rows, academicPeriodId, chairmanCollegeId, programId, subjectById, userById, profileByUserId]);

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
  const saveLoadJustificationForDoi = useCallback(async () => {
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
    if (!policyRows.hasAnyViolation) {
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
      const snapRows = policyRows.rows
        .filter((r) => r.violations.length > 0)
        .map(
          (r) =>
            `${r.instructorName}: ${r.weeklyTotalContactHours.toFixed(1)} hrs/wk — ${r.violations.map((v) => v.code).join(", ")}`,
        );
      const { error: jErr } = await supabase.from("ScheduleLoadJustification").upsert(
        {
          academicPeriodId,
          collegeId: chairmanCollegeId,
          authorUserId: user.id,
          authorName,
          authorEmail: user.email ?? null,
          justification: t,
          violationsSnapshot: { summary: snapRows.join("\n"), detail: policyRows.rows },
          doiDecision: null,
          doiReviewedAt: null,
          doiReviewedById: null,
          doiReviewNote: null,
        },
        { onConflict: "academicPeriodId,collegeId" },
      );
      if (jErr) {
        setJustificationMsg(jErr.message);
        return false;
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
  }, [academicPeriodId, chairmanCollegeId, justificationText, policyRows, dbInstructors]);

  function updateRow(id: string, patch: Partial<PlotRow>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (r.lockedByDoiAt) return r;
        const next = { ...r, ...patch };
        const p = next.subjectCode ? prospectusByCode(next.subjectCode) : undefined;
        if (p) {
          const d = scheduleDurationSlots(p);
          const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - d;
          if (next.startSlotIndex > maxS) return { ...next, startSlotIndex: maxS };
        }
        return next;
      }),
    );
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
      if (t) slotIndexByStartTime.set(t.startTime, i);
    }

    const nextRows: PlotRow[] = relevant.map((e) => ({
      id: e.id,
      sectionId: e.sectionId,
      students: "",
      subjectCode: subjectCodeById.get(e.subjectId) ?? "",
      instructorId: e.instructorId,
      roomId: e.roomId,
      startSlotIndex: slotIndexByStartTime.get(e.startTime) ?? 0,
      day: (BSIT_EVALUATOR_WEEKDAYS.includes(e.day as BsitEvaluatorWeekday) ? (e.day as BsitEvaluatorWeekday) : "Monday"),
      lockedByDoiAt: e.lockedByDoiAt ?? null,
    }));

    didHydrateFromDbRef.current = true;
    lastSyncedRowIdsRef.current = new Set(nextRows.map((r) => r.id));
    /** Cross-reload replays full DB rows; keep client-only draft rows until they are persisted (prevents “row disappears”). */
    setRows((prev) => {
      const dbIds = new Set(nextRows.map((r) => r.id));
      const pending = prev.filter((r) => !dbIds.has(r.id) && !r.lockedByDoiAt);
      return [...nextRows, ...pending];
    });

    if (chairmanCollegeId) {
      const { data: lj } = await supabase
        .from("ScheduleLoadJustification")
        .select(Q.scheduleLoadJustification)
        .eq("academicPeriodId", academicPeriodId)
        .eq("collegeId", chairmanCollegeId)
        .maybeSingle();
      setJustificationText((lj as ScheduleLoadJustification | null)?.justification ?? "");
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
          const tb = rowTimeBounds(row);
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
    [rows, academicPeriodId, subjectIdByCode, chairmanCollegeId, sectionNameById, toast],
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
                <th className="border border-black/10 px-2 py-2.5 text-left font-bold">Room</th>
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
                      : "No rows yet. Click “Add schedule row” to plot BSIT sections (Mon–Fri, 7:00 AM–5:00 PM)."}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, i) => {
                  const pr = row.subjectCode ? prospectusByCode(row.subjectCode) : undefined;
                  const dur = pr ? scheduleDurationSlots(pr) : 1;
                  const maxStart = BSIT_EVALUATOR_TIME_SLOTS.length - dur;
                  const effectiveStart = Math.min(row.startSlotIndex, maxStart);
                  const sectionName = row.sectionId ? (sectionNameById.get(row.sectionId) ?? "") : "";
                  const yearLevel = sectionName ? yearLevelFromBsitSectionName(sectionName) : null;
                  const subjectOptions =
                    yearLevel == null
                      ? []
                      : termProspectusSemester != null
                        ? prospectusSubjectsForYearAndSemester(yearLevel, termProspectusSemester)
                        : prospectusSubjectsForYearLevel(yearLevel);
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
                      <td className="border border-black/10 px-2 py-1.5 font-semibold text-black/80">{MAJOR_FIXED}</td>
                      <td className="border border-black/10 px-1 py-1">
                        <select
                          className={selectClass}
                          value={row.sectionId}
                          disabled={rowReadOnly}
                          onChange={(e) => {
                            const sectionId = e.target.value;
                            const name = programSections.find((s) => s.id === sectionId)?.name ?? "";
                            const yl = yearLevelFromBsitSectionName(name);
                            let subjectCode = row.subjectCode;
                            if (subjectCode && yl != null) {
                              const s = prospectusByCode(subjectCode);
                              const sem = termProspectusSemester;
                              if (!s || s.yearLevel !== yl) subjectCode = "";
                              else if (sem != null && s.semester !== sem) subjectCode = "";
                            }
                            updateRow(row.id, { sectionId, subjectCode });
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
                            const p = subjectCode ? prospectusByCode(subjectCode) : undefined;
                            let startSlotIndex = row.startSlotIndex;
                            if (p) {
                              const d = scheduleDurationSlots(p);
                              const maxS = BSIT_EVALUATOR_TIME_SLOTS.length - d;
                              if (startSlotIndex > maxS) startSlotIndex = maxS;
                            }
                            updateRow(row.id, { subjectCode, startSlotIndex });
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
                          onChange={(e) => updateRow(row.id, { instructorId: e.target.value })}
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
                      <td className="border border-black/10 px-1 py-1">
                        <select
                          className={selectClass}
                          value={row.roomId}
                          disabled={rowReadOnly}
                          onChange={(e) => updateRow(row.id, { roomId: e.target.value })}
                        >
                          <option value="">Select…</option>
                          {itLabsWithFallback.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.code}
                            </option>
                          ))}
                        </select>
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
                            onChange={(e) => updateRow(row.id, { startSlotIndex: parseInt(e.target.value, 10) })}
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
                          onChange={(e) => updateRow(row.id, { day: e.target.value as BsitEvaluatorWeekday })}
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
        open={policyJustificationModalOpen && showJustification}
        title="Policy justification"
        promptText="This assignment exceeds the faculty load policy. Do you want to proceed with justification?"
        value={justificationText}
        minLength={12}
        saving={justificationSaving || saveScheduleBusy}
        onChange={setJustificationText}
        onCancel={() => setPolicyJustificationModalOpen(false)}
        onSave={async () => {
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
  sectionNameById,
  roomCodeById,
  instructorDisplayById,
  selectedSectionId,
}: {
  rows: PlotRow[];
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
      const p = row.subjectCode ? prospectusByCode(row.subjectCode) : undefined;
      if (!row.sectionId || !row.subjectCode || !p) continue;
      const dur = scheduleDurationSlots(p);
      const maxS = slots.length - dur;
      const start = Math.min(row.startSlotIndex, maxS);
      for (let k = 1; k < dur; k++) {
        m.add(`${row.day}-${start + k}`);
      }
    }
    return m;
  }, [filteredRows]);

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
                    const p = r.subjectCode ? prospectusByCode(r.subjectCode) : undefined;
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
                      const p = prospectusByCode(r.subjectCode);
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
                          const p = prospectusByCode(r.subjectCode);
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
