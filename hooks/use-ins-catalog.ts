"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, catalogApi } from "@/lib/api/client";
import { useSemesterFilterOptional } from "@/contexts/SemesterFilterContext";
import { normalizeProspectusCode } from "@/lib/chairman/bsit-prospectus";
import {
  dispatchInsCatalogReload,
  INS_CATALOG_RELOAD_EVENT,
  type InsCatalogReloadDetail,
  subscribeScheduleEntryBroadcast,
} from "@/lib/ins/ins-catalog-reload";
import { subscribeScheduleEntryRealtimePool } from "@/lib/ins/schedule-entry-realtime-pool";
import { preserveListIdentity } from "@/lib/collections/preserve-identity";
import { formatUserInstructorLabel } from "@/lib/evaluator/instructor-employee-id";
import { insInstructorDisplayName } from "@/lib/ins/ins-instructor-display";
import {
  enrichCampusConflictIssues,
  conflictHeadlineShort,
  conflictSummaryLine,
} from "@/lib/scheduling/conflict-enrichment";
import { runCampusConflictScan } from "@/lib/scheduling/campus-conflict-scan-client";
import { scanAllSparseScheduleConflicts, scheduleEntryToSparseBlock } from "@/lib/scheduling/conflicts";
import { filterByProgramMode, hydrateScheduleEntries, resolveProgramMode } from "@/lib/scheduling/program-mode";
import { useProgramMode } from "@/contexts/ProgramModeContext";
import { formatGaSuggestionShortLabel } from "@/lib/scheduling/conflict-suggestion-label";
import { runRuleBasedGeneticAlgorithm } from "@/lib/scheduling/ruleBasedGA";
import { slotDurationHours } from "@/lib/scheduling/time";
import type { ScheduleBlock } from "@/lib/scheduling/types";
import type {
  AcademicPeriod,
  CampusInsSettings,
  College,
  FacultyProfile,
  Program,
  Room,
  ScheduleEntry,
  Section,
  Subject,
  User,
} from "@/types/db";
import { isPlottableFacultyUser } from "@/lib/auth/instructor-validation";

/** Merge catalog rows by primary key (later arrays win) — links term `ScheduleEntry` to cross-college Section/Subject. */
function mergeRowsById<T extends { id: string }>(primary: T[], ...extras: T[][]): T[] {
  const m = new Map<string, T>();
  for (const r of primary) m.set(r.id, r);
  for (const block of extras) {
    for (const r of block) m.set(r.id, r);
  }
  return [...m.values()];
}

function toScheduleBlock(e: ScheduleEntry): ScheduleBlock {
  return {
    id: e.id,
    academicPeriodId: e.academicPeriodId,
    subjectId: e.subjectId,
    instructorId: e.instructorId,
    sectionId: e.sectionId,
    roomId: e.roomId,
    day: e.day,
    startTime: e.startTime,
    endTime: e.endTime,
    programMode: resolveProgramMode(e),
  };
}

export type InsInstructorOption = { id: string; name: string };
export type InsSectionOption = { id: string; name: string };
export type InsRoomOption = { id: string; name: string };

function defaultAcademicPeriodId(periods: readonly { id: string; isCurrent: boolean }[]): string {
  const cur = periods.find((p) => p.isCurrent) ?? periods[0];
  return cur?.id ?? "";
}

/**
 * Shared Express API load + polling for INS views (faculty / section / room).
 * When `campusWide` is true, loads all schedule rows (DOI / VPAA) without filtering by college.
 */
export function useInsCatalog(args: {
  collegeId: string | null;
  programId: string | null;
  campusWide?: boolean;
  /**
   * Faculty portal: after college/program scoping, keep only sections where this instructor teaches
   * at least one class (so Section/Room INS tabs show peers in shared sections, not the whole college).
   */
  instructorPortalUserId?: string | null;
  /**
   * INS Form 5A (faculty-by-name): include every program in the college for the term.
   * When false, a chairman `programId` limits **worksflow subject maps** — not INS 5B/5C rows
   * (`insResourceEntries` stays campus-wide within RLS).
   */
  ignoreProgramScope?: boolean;
}) {
  const semesterFilter = useSemesterFilterOptional();
  const { programMode } = useProgramMode();
  /** Fallback when `SemesterFilterProvider` is not mounted (e.g. isolated tests). */
  const [fallbackPeriodId, setFallbackPeriodId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  /** `userId` + name fields for INS labels (AKA vs full name; never Employee ID). */
  const [facultyInsNames, setFacultyInsNames] = useState<Pick<FacultyProfile, "userId" | "fullName" | "aka">[]>([]);
  const [campusInsSettings, setCampusInsSettings] = useState<CampusInsSettings | null>(null);
  /** Latest explicit “Run conflict check” (API + local); null = use computed scan from entries. */
  const [insConflictScanOverride, setInsConflictScanOverride] = useState<{
    conflictingEntryIds: Set<string>;
    issues: { entryId: string; type: string; message: string; relatedEntryId?: string }[];
    issueSummaries: string[];
  } | null>(null);
  const skipPeriodEntryFetchRef = useRef(true);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * `load()` reads `fallbackPeriodId` but also writes it. Keeping it in a ref
   * (rather than the `useCallback` dep array) breaks the
   * render → load → setFallbackPeriodId → new load identity → effect → load
   * cycle that fired `/api/catalog/ins-bundle` two-to-three times per mount.
   */
  const fallbackPeriodIdRef = useRef(fallbackPeriodId);
  fallbackPeriodIdRef.current = fallbackPeriodId;
  /** Coalesce chairman/GEC save broadcasts into one full catalog pull so new entry ids refresh Section/Subject merges (INS hours). */
  const insFullReloadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Second soft `ScheduleEntry` pull after reload — helps same-tab read-your-writes when PostgREST briefly returns old rows. */
  const insCatalogSoftRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const academicPeriodId =
    semesterFilter?.ready && semesterFilter.selectedPeriodId ? semesterFilter.selectedPeriodId : fallbackPeriodId;

  const setAcademicPeriodId = useCallback(
    (id: string) => {
      semesterFilter?.setSelectedPeriodId(id);
      setFallbackPeriodId(id);
    },
    [semesterFilter],
  );

  /**
   * Lightweight reload used by Realtime + cross-tab broadcast: only refresh `ScheduleEntry` rows for the active term.
   * This avoids refetching Programs/Sections/Subjects/Rooms/Users on every save (major lag source).
   */
  const loadScheduleEntriesForPeriod = useCallback(
    async (opts?: { periodId?: string; soft?: boolean }) => {
      const periodId = (opts?.periodId ?? academicPeriodId ?? "").trim();
      const soft = Boolean(opts?.soft);
      if (!periodId) return;
      if (!soft) setLoading(true);
      try {
        const data = await catalogApi.scheduleEntries<{ entries: ScheduleEntry[] }>(periodId);
        /**
         * Keep the previous array when the poll returned identical rows. A new
         * array identity here would cascade through `insResourceEntries` →
         * `schedule` → `pdfData` and make `@react-pdf` regenerate an open
         * preview on every 30s tick even though nothing changed.
         */
        setEntries((prev) => preserveListIdentity(prev, hydrateScheduleEntries(data.entries ?? [])) as ScheduleEntry[]);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load schedule entries");
      }
      if (!soft) setLoading(false);
    },
    [academicPeriodId],
  );

  const load = useCallback(async () => {
    if (!args.collegeId && !args.campusWide) {
      setLoading(false);
      setEntries([]);
      setFacultyInsNames([]);
      setCampusInsSettings(null);
      setError(null);
      return;
    }
    setError(null);
    setLoading(true);
    skipPeriodEntryFetchRef.current = true;

    // ── Load catalog from Express API bundle ──
    let bundle: {
      periods: AcademicPeriod[];
      entries: ScheduleEntry[];
      programs: Program[];
      sections: Section[];
      subjects: Subject[];
      rooms: Room[];
      colleges: College[];
      users: User[];
      settings: CampusInsSettings | null;
      facultyProfiles: Pick<FacultyProfile, "userId" | "fullName" | "aka">[];
    } | null = null;

    try {
      bundle = await catalogApi.insBundle<any>();
    } catch {
      setLoading(false);
      return;
    }
    if (!bundle) { setLoading(false); return; }

    const periodList = bundle.periods;

    let periodId = "";
    if (semesterFilter?.ready && semesterFilter.selectedPeriodId) {
      periodId = semesterFilter.selectedPeriodId;
    } else if (!semesterFilter) {
      periodId = fallbackPeriodIdRef.current || defaultAcademicPeriodId(periodList);
    } else {
      periodId = defaultAcademicPeriodId(periodList);
    }

    const sch = bundle.entries.filter((e) => e.academicPeriodId === periodId);

    const entrySectionIds = [...new Set(sch.map((e) => e.sectionId))];
    const entrySubjectIds = [...new Set(sch.map((e) => e.subjectId))];
    const entryRoomIds = [...new Set(sch.map((e) => e.roomId))];
    const entryInstructorIds = [...new Set(sch.map((e) => e.instructorId))];

    const scopedCollegeId = args.campusWide ? null : args.collegeId?.trim() || null;
    let programIdsForScope: string[] = [];
    let prList: Program[] = [];
    if (scopedCollegeId) {
      prList = bundle.programs.filter((p) => p.collegeId === scopedCollegeId);
      programIdsForScope = prList.map((p) => p.id);
    }

    if (!scopedCollegeId) {
      setPeriods(periodList);
      setEntries((prev) => preserveListIdentity(prev, hydrateScheduleEntries(sch)) as ScheduleEntry[]);
      setSections(bundle.sections);
      setSubjects(bundle.subjects);
      setRooms(bundle.rooms);
      setPrograms(bundle.programs);
      setColleges(bundle.colleges);
      setUsers(bundle.users);
      setFacultyInsNames(bundle.facultyProfiles);
      setCampusInsSettings(bundle.settings);
      if (!semesterFilter && periodId) setFallbackPeriodId(periodId);
      setLoading(false);
      return;
    }

    const sectionsMerged = mergeRowsById(
      bundle.sections.filter((s) => programIdsForScope.includes(s.programId)),
      bundle.sections.filter((s) => entrySectionIds.includes(s.id)),
    );
    const subjectsMerged = mergeRowsById(
      bundle.subjects.filter((s) => programIdsForScope.includes(s.programId)),
      bundle.subjects.filter((s) => entrySubjectIds.includes(s.id)),
    );
    const roomsMerged = mergeRowsById(
      bundle.rooms.filter((r) => !r.collegeId || r.collegeId === scopedCollegeId),
      bundle.rooms.filter((r) => entryRoomIds.includes(r.id)),
    );
    const usersMerged = mergeRowsById(
      bundle.users.filter((u) => !u.collegeId || u.collegeId === scopedCollegeId),
      bundle.users.filter((u) => entryInstructorIds.includes(u.id)),
    );

    const prIdSet = new Set(prList.map((p) => p.id));
    const extraProgIds = [
      ...new Set(sectionsMerged.map((s) => s.programId).filter((pid) => pid && !prIdSet.has(pid))),
    ];
    const programsFinal = extraProgIds.length > 0
      ? [...prList, ...bundle.programs.filter((p) => extraProgIds.includes(p.id))]
      : prList;

    setPeriods(periodList);
    setEntries((prev) => preserveListIdentity(prev, hydrateScheduleEntries(sch)) as ScheduleEntry[]);
    setSections(sectionsMerged);
    setSubjects(subjectsMerged);
    setRooms(roomsMerged);
    setPrograms(programsFinal);
    setColleges(bundle.colleges);
    setUsers(usersMerged);
    setFacultyInsNames(bundle.facultyProfiles);
    setCampusInsSettings(bundle.settings);
    if (!semesterFilter && periodId) setFallbackPeriodId(periodId);
    setLoading(false);
    // `fallbackPeriodId` is intentionally read through a ref — see the ref declaration.
  }, [args.collegeId, args.campusWide, semesterFilter?.ready, semesterFilter?.selectedPeriodId]);

  useEffect(() => {
    void load();
  }, [load]);

  const scheduleDebouncedReload = useCallback(() => {
    if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
    /** Keep INS previews feeling near-real-time while still coalescing bursty DB events. */
    realtimeDebounceRef.current = setTimeout(() => void loadScheduleEntriesForPeriod({ soft: true }), 140);
  }, [loadScheduleEntriesForPeriod]);

  /**
   * Term sync (replacement for Supabase Realtime).
   *
   * We subscribe to the shared per-term pool rather than running our own
   * `setInterval`. Previously both this hook AND the pool polled the same
   * `/api/catalog/schedule-entries` URL every 30s, so a page mounting an INS
   * form plus an Evaluator view issued several identical requests per tick.
   *
   * The pool fetches once with `forceRefresh` and warms the cache before
   * notifying us, so `loadScheduleEntriesForPeriod` below reads that warm entry
   * instead of hitting the network again.
   */
  useEffect(() => {
    if (!args.collegeId && !args.campusWide) return;
    if (!academicPeriodId) return;
    return subscribeScheduleEntryRealtimePool(academicPeriodId, scheduleDebouncedReload);
  }, [scheduleDebouncedReload, args.collegeId, args.campusWide, academicPeriodId]);

  /**
   * Same-tab + cross-tab: chairman/GEC saves broadcast a reload.
   * - **Immediate** `loadScheduleEntriesForPeriod({ soft: true })` so INS grids + section views pick up new times
   *   without waiting for the heavy `load()` round-trip (fixes stale 12:00 vs 2:00 PM after Evaluator save).
   * - **Debounced** full `load()` still runs so term-referenced Section/Subject merges stay correct for hours totals.
   * - **Delayed soft retry** (~700ms) catches occasional read-after-write lag from PostgREST.
   * Realtime continues to use lightweight `loadScheduleEntriesForPeriod` only.
   */
  useEffect(() => {
    if (!args.collegeId && !args.campusWide) return;
    const scheduleFullReload = (detail?: InsCatalogReloadDetail) => {
      const hintedPeriodId = (detail?.academicPeriodId ?? "").trim();
      void loadScheduleEntriesForPeriod({ periodId: hintedPeriodId || academicPeriodId, soft: true });
      if (insCatalogSoftRetryRef.current) clearTimeout(insCatalogSoftRetryRef.current);
      insCatalogSoftRetryRef.current = setTimeout(() => {
        insCatalogSoftRetryRef.current = null;
        void loadScheduleEntriesForPeriod({ periodId: hintedPeriodId || academicPeriodId, soft: true });
      }, 700);

      if (insFullReloadDebounceRef.current) clearTimeout(insFullReloadDebounceRef.current);
      insFullReloadDebounceRef.current = setTimeout(() => {
        insFullReloadDebounceRef.current = null;
        void load();
      }, 220);
    };
    if (typeof BroadcastChannel !== "undefined") {
      const unsub = subscribeScheduleEntryBroadcast(scheduleFullReload);
      return () => {
        unsub();
        if (insFullReloadDebounceRef.current) clearTimeout(insFullReloadDebounceRef.current);
        if (insCatalogSoftRetryRef.current) clearTimeout(insCatalogSoftRetryRef.current);
      };
    }
    const onWindowReload = (ev: Event) => {
      scheduleFullReload((ev as CustomEvent<InsCatalogReloadDetail>)?.detail);
    };
    window.addEventListener(INS_CATALOG_RELOAD_EVENT, onWindowReload);
    return () => {
      window.removeEventListener(INS_CATALOG_RELOAD_EVENT, onWindowReload);
      if (insFullReloadDebounceRef.current) clearTimeout(insFullReloadDebounceRef.current);
      if (insCatalogSoftRetryRef.current) clearTimeout(insCatalogSoftRetryRef.current);
    };
  }, [load, loadScheduleEntriesForPeriod, args.collegeId, args.campusWide, academicPeriodId]);

  useEffect(() => {
    if (!args.collegeId && !args.campusWide) return;
    if (!academicPeriodId) return;
    if (skipPeriodEntryFetchRef.current) {
      skipPeriodEntryFetchRef.current = false;
      return;
    }
    void loadScheduleEntriesForPeriod({ periodId: academicPeriodId, soft: true });
  }, [academicPeriodId, args.collegeId, args.campusWide, loadScheduleEntriesForPeriod]);

  useEffect(() => {
    if (semesterFilter) return;
    if (periods.length === 0 || fallbackPeriodId) return;
    const cur = periods.find((x) => x.isCurrent) ?? periods[0];
    if (cur) setFallbackPeriodId(cur.id);
  }, [periods, fallbackPeriodId, semesterFilter]);

  const sectionById = useMemo(() => {
    const m = new Map<string, Section>();
    sections.forEach((s) => m.set(s.id, s));
    return m;
  }, [sections]);

  const subjectById = useMemo(() => {
    const m = new Map<string, Subject>();
    subjects.forEach((s) => m.set(s.id, s));
    return m;
  }, [subjects]);

  const roomById = useMemo(() => {
    const m = new Map<string, Room>();
    rooms.forEach((r) => m.set(r.id, r));
    return m;
  }, [rooms]);

  const programById = useMemo(() => {
    const m = new Map<string, Program>();
    programs.forEach((p) => m.set(p.id, p));
    return m;
  }, [programs]);

  const userById = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const facultyProfileByUserId = useMemo(() => {
    const m = new Map<string, Pick<FacultyProfile, "fullName" | "aka">>();
    for (const p of facultyInsNames) {
      m.set(p.userId, { fullName: p.fullName, aka: p.aka });
    }
    return m;
  }, [facultyInsNames]);

  const modeEntries = useMemo(
    () => filterByProgramMode(entries, programMode),
    [entries, programMode],
  );

  /**
   * College + optional program slice (share bundles, program-scoped `subjectIdByCode`). Not used for INS 5B/5C grids.
   */
  const scopedEntries = useMemo(() => {
    let base: ScheduleEntry[];
    if (args.campusWide) {
      base = modeEntries.filter((e) => sectionById.has(e.sectionId));
    } else if (!args.collegeId) {
      base = modeEntries;
    } else {
      base = modeEntries.filter((e) => {
        const sec = sectionById.get(e.sectionId);
        if (!sec) return false;
        const pr = programById.get(sec.programId);
        if (!pr) return false;
        if (pr.collegeId !== args.collegeId) return false;
        if (args.programId && !args.ignoreProgramScope && sec.programId !== args.programId) return false;
        return true;
      });
    }
    const uid = args.instructorPortalUserId?.trim();
    if (!uid) return base;
    const teachingSectionIds = new Set(
      base.filter((e) => e.instructorId === uid).map((e) => e.sectionId),
    );
    if (teachingSectionIds.size === 0) return [];
    return base.filter((e) => teachingSectionIds.has(e.sectionId));
  }, [
    modeEntries,
    args.collegeId,
    args.programId,
    args.campusWide,
    args.ignoreProgramScope,
    args.instructorPortalUserId,
    sectionById,
    programById,
  ]);

  /**
   * INS instructor/section/room pickers + Forms 5B/5C: all term rows the viewer can read (campus-wide under RLS).
   * Home-college instructors may teach CAS (etc.) sections; those rows must appear here for correct grids and counts.
   * Faculty portal: when set, limits 5B/5C to sections where this user teaches (omit for full college browse on `/faculty/ins`).
   */
  const insResourceEntries = useMemo(() => {
    if (args.campusWide) {
      return modeEntries.filter((e) => sectionById.has(e.sectionId));
    }
    if (!args.collegeId) return modeEntries;
    const uid = args.instructorPortalUserId?.trim();
    if (uid) {
      const termAll = modeEntries.filter((e) => e.academicPeriodId === academicPeriodId);
      const teachingSectionIds = new Set(termAll.filter((e) => e.instructorId === uid).map((e) => e.sectionId));
      if (teachingSectionIds.size === 0) return [];
      return modeEntries.filter((e) => teachingSectionIds.has(e.sectionId));
    }
    return modeEntries;
  }, [modeEntries, args.campusWide, args.collegeId, args.instructorPortalUserId, academicPeriodId, sectionById]);

  const termResourceEntries = useMemo(
    () => insResourceEntries.filter((e) => e.academicPeriodId === academicPeriodId),
    [insResourceEntries, academicPeriodId],
  );

  /** For workflow bundles: map normalized subject code → id (Chairman program scope). */
  const subjectIdByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of subjects) {
      if (args.programId && s.programId !== args.programId) continue;
      m.set(normalizeProspectusCode(s.code), s.id);
    }
    return m;
  }, [subjects, args.programId]);

  /** Only instructors scoped to the college/program (matches production "N with classes"). */
  const instructorOptions: InsInstructorOption[] = useMemo(() => {
    const ids = new Set<string>();
    for (const e of scopedEntries) {
      if (e.instructorId) ids.add(e.instructorId);
    }
    const list: InsInstructorOption[] = [];
    for (const id of ids) {
      const u = users.find((x) => x.id === id);
      if (u)
        list.push({
          id: u.id,
          name: insInstructorDisplayName(u, facultyProfileByUserId.get(id)),
        });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [scopedEntries, users, facultyProfileByUserId]);

  const sectionOptions: InsSectionOption[] = useMemo(() => {
    const ids = new Set<string>();
    for (const e of termResourceEntries) {
      ids.add(e.sectionId);
    }
    const list: InsSectionOption[] = [];
    for (const id of ids) {
      const s = sectionById.get(id);
      if (s) list.push({ id: s.id, name: s.name });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [termResourceEntries, sectionById]);

  const roomOptions: InsRoomOption[] = useMemo(() => {
    const ids = new Set<string>();
    for (const e of termResourceEntries) {
      ids.add(e.roomId);
    }
    const list: InsRoomOption[] = [];
    for (const id of ids) {
      const r = roomById.get(id);
      if (r) list.push({ id: r.id, name: r.code });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [termResourceEntries, roomById]);

  const periodLabel = periods.find((p) => p.id === academicPeriodId)?.name ?? "";

  const collegeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of colleges) m.set(c.id, c.name);
    return m;
  }, [colleges]);

  /** Same scope as Evaluator grid: every `ScheduleEntry` row in this term (not only the INS college/program filter). */
  const getInsConflictSummaries = useCallback(() => {
    const blocks = modeEntries
      .filter((e) => e.academicPeriodId === academicPeriodId)
      .map((e) => scheduleEntryToSparseBlock(e))
      .filter((b): b is NonNullable<typeof b> => b != null);
    return scanAllSparseScheduleConflicts(blocks).issueSummaries;
  }, [modeEntries, academicPeriodId]);

  /** Full alert body: enriched causes + one GA-style suggestion per unique issue (when pools are available). */
  const buildInsConflictAlertText = useCallback(
    (scan: {
      issues: { entryId: string; type: string; message: string; relatedEntryId?: string }[];
      issueSummaries: string[];
    }): string => {
    if (!academicPeriodId || scan.issueSummaries.length === 0) return "";
    const termRows = modeEntries.filter((e) => e.academicPeriodId === academicPeriodId);

    const entryById = new Map(entries.map((e) => [e.id, e]));
    const enriched = enrichCampusConflictIssues(
      scan.issues,
      entryById,
      subjectById,
      sectionById,
      roomById,
      userById,
      programById,
      collegeNameById,
    );

    const roomIds = rooms.map((r) => r.id);
    const instructorIds = users
      .filter((u) => isPlottableFacultyUser(u))
      .map((u) => u.id);

    const lines: string[] = [`Scanned ${termRows.length} schedule row(s) this term.`, ""];

    const seen = new Set<string>();
    let n = 0;
    for (const iss of enriched) {
      if (n >= 12) break;
      if (seen.has(iss.key)) continue;
      seen.add(iss.key);
      n += 1;
      lines.push(`• ${conflictHeadlineShort(iss)}`);
      lines.push(`  ${conflictSummaryLine(iss)}`);

      const entry = entryById.get(iss.rowA.entryId);
      if (entry && roomIds.length > 0 && instructorIds.length > 0) {
        const universeForGa = termRows.map(toScheduleBlock);
        const durationHours = slotDurationHours(entry.startTime, entry.endTime) || 2;
        const sug = runRuleBasedGeneticAlgorithm({
          universe: universeForGa,
          sectionId: entry.sectionId,
          subjectId: entry.subjectId,
          academicPeriodId: entry.academicPeriodId,
          excludeEntryId: entry.id,
          durationHours,
          fixedInstructorId: entry.instructorId,
          roomIds,
          instructorIds,
          generations: 28,
          populationSize: 40,
        });
        const best = sug[0];
        if (best) {
          const rc = roomById.get(best.roomId)?.code ?? "TBA";
          const inst = formatUserInstructorLabel(
            userById.get(best.instructorId),
            facultyProfileByUserId.get(best.instructorId),
          );
          lines.push(`  Option: ${formatGaSuggestionShortLabel(best, { roomCode: rc, instructorDisplay: inst })}`);
        }
      }
      lines.push("");
    }

    if (n === 0 && scan.issueSummaries.length > 0) {
      for (const msg of scan.issueSummaries.slice(0, 12)) {
        lines.push(`• ${msg}`);
      }
      lines.push("");
    }

    return lines.join("\n").trim();
    },
    [
      academicPeriodId,
      entries,
      subjectById,
      sectionById,
      roomById,
      userById,
      programById,
      collegeNameById,
      rooms,
      users,
      facultyProfileByUserId,
    ],
  );

  /**
   * Full-term sparse conflict scan (same semantics as Evaluator). Used to tint INS grid cells and to offer
   * one-click “apply alternative” for College Admin / DOI without opening the chairman worksheet.
   */
  const insConflictScanComputed = useMemo(() => {
    if (!academicPeriodId) {
      return {
        conflictingEntryIds: new Set<string>(),
        issues: [] as { entryId: string; type: string; message: string; relatedEntryId?: string }[],
        issueSummaries: [] as string[],
      };
    }
    const termRows = modeEntries.filter((e) => e.academicPeriodId === academicPeriodId);
    const blocks = termRows
      .map((e) => scheduleEntryToSparseBlock(e))
      .filter((b): b is NonNullable<typeof b> => b != null);
    const scan = scanAllSparseScheduleConflicts(blocks);
    return { ...scan, issueSummaries: scan.issueSummaries };
  }, [modeEntries, academicPeriodId]);

  useEffect(() => {
    setInsConflictScanOverride(null);
  }, [modeEntries, academicPeriodId]);

  const insConflictScan = insConflictScanOverride ?? insConflictScanComputed;

  const insConflictingEntryIds = insConflictScan.conflictingEntryIds;

  const runInsConflictCheck = useCallback(async () => {
    if (!academicPeriodId) {
      return { ok: false, message: "Select an academic term first.", conflictingCount: 0 };
    }
    const scan = await runCampusConflictScan({
      academicPeriodId,
      localEntries: modeEntries,
      apiMode: args.campusWide ? "doi_campus" : "college",
      collegeId: args.campusWide ? null : args.collegeId,
      programId: args.ignoreProgramScope ? null : args.programId,
      programMode,
    });
    setInsConflictScanOverride({
      conflictingEntryIds: scan.conflictingEntryIds,
      issues: scan.issues,
      issueSummaries: scan.issueSummaries,
    });
    if (scan.conflictingEntryIds.size === 0) {
      return {
        ok: true,
        message: scan.apiOk
          ? "No instructor, room, or section time conflicts detected for this term (full campus scan)."
          : `No conflicts on-screen. Server scan unavailable: ${scan.apiError ?? "error"}`,
        conflictingCount: 0,
      };
    }
    const detail = buildInsConflictAlertText({
      issues: scan.issues,
      issueSummaries: scan.issueSummaries,
    });
    return { ok: true, message: detail, conflictingCount: scan.conflictingEntryIds.size };
  }, [
    academicPeriodId,
    entries,
    args.campusWide,
    args.collegeId,
    args.programId,
    args.ignoreProgramScope,
    buildInsConflictAlertText,
  ]);

  const getInsConflictAlertText = useCallback(
    () => buildInsConflictAlertText(insConflictScan),
    [buildInsConflictAlertText, insConflictScan],
  );

  /**
   * INS Form 5A: conflict lines + GA-style suggestions for issues touching the selected instructor (Evaluator parity).
   */
  const getInsConflictLinesForInstructor = useCallback(
    (instructorId: string): string[] => {
      if (!academicPeriodId || !instructorId.trim()) return [];
      if (insConflictScan.issueSummaries.length === 0) return [];

      const termRows = modeEntries.filter((e) => e.academicPeriodId === academicPeriodId);
      const entryById = new Map(entries.map((e) => [e.id, e]));
      const enriched = enrichCampusConflictIssues(
        insConflictScan.issues,
        entryById,
        subjectById,
        sectionById,
        roomById,
        userById,
        programById,
        collegeNameById,
      );

      const roomIds = rooms.map((r) => r.id);
      const instructorIds = users
        .filter((u) => isPlottableFacultyUser(u))
        .map((u) => u.id);

      const lines: string[] = [];
      const seen = new Set<string>();
      let n = 0;
      for (const iss of enriched) {
        if (n >= 8) break;
        if (seen.has(iss.key)) continue;
        const aE = entryById.get(iss.rowA.entryId);
        const bE = entryById.get(iss.rowB.entryId);
        if (aE?.instructorId !== instructorId && bE?.instructorId !== instructorId) continue;
        seen.add(iss.key);
        n += 1;
        lines.push(conflictSummaryLine(iss));
        const entry = aE?.instructorId === instructorId ? aE : bE;
        if (entry && roomIds.length > 0 && instructorIds.length > 0) {
          const universeForGa = termRows.map(toScheduleBlock);
          const durationHours = slotDurationHours(entry.startTime, entry.endTime) || 2;
          const sug = runRuleBasedGeneticAlgorithm({
            universe: universeForGa,
            sectionId: entry.sectionId,
            subjectId: entry.subjectId,
            academicPeriodId: entry.academicPeriodId,
            excludeEntryId: entry.id,
            durationHours,
            fixedInstructorId: entry.instructorId,
            roomIds,
            instructorIds,
            generations: 28,
            populationSize: 40,
          });
          const best = sug[0];
          if (best) {
            const rc = roomById.get(best.roomId)?.code ?? "TBA";
            const inst = formatUserInstructorLabel(
              userById.get(best.instructorId),
              facultyProfileByUserId.get(best.instructorId),
            );
            lines.push(
              `Option: ${formatGaSuggestionShortLabel(best, { roomCode: rc, instructorDisplay: inst })}`,
            );
          }
        }
      }
      return lines;
    },
    [
      academicPeriodId,
      entries,
      insConflictScan,
      subjectById,
      sectionById,
      roomById,
      userById,
      programById,
      collegeNameById,
      rooms,
      users,
      facultyProfileByUserId,
    ],
  );

  const getFirstConflictingEntryIdForInstructor = useCallback(
    (instructorId: string): string | null => {
      const uid = instructorId.trim();
      if (!uid) return null;
      const entryById = new Map(entries.map((e) => [e.id, e]));
      for (const iss of insConflictScan.issues) {
        const a = entryById.get(iss.entryId);
        if (a?.instructorId === uid) return iss.entryId;
        if (iss.relatedEntryId) {
          const b = entryById.get(iss.relatedEntryId);
          if (b?.instructorId === uid) return iss.relatedEntryId;
        }
      }
      return null;
    },
    [entries, insConflictScan.issues],
  );

  const getFirstConflictingEntryIdForSection = useCallback(
    (sectionId: string): string | null => {
      const sid = sectionId.trim();
      if (!sid) return null;
      const entryById = new Map(entries.map((e) => [e.id, e]));
      for (const iss of insConflictScan.issues) {
        const a = entryById.get(iss.entryId);
        if (a?.sectionId === sid) return iss.entryId;
        if (iss.relatedEntryId) {
          const b = entryById.get(iss.relatedEntryId);
          if (b?.sectionId === sid) return iss.relatedEntryId;
        }
      }
      return null;
    },
    [entries, insConflictScan.issues],
  );

  const getFirstConflictingEntryIdForRoom = useCallback(
    (roomId: string): string | null => {
      const rid = roomId.trim();
      if (!rid) return null;
      const entryById = new Map(entries.map((e) => [e.id, e]));
      for (const iss of insConflictScan.issues) {
        const a = entryById.get(iss.entryId);
        if (a?.roomId === rid) return iss.entryId;
        if (iss.relatedEntryId) {
          const b = entryById.get(iss.relatedEntryId);
          if (b?.roomId === rid) return iss.relatedEntryId;
        }
      }
      return null;
    },
    [entries, insConflictScan.issues],
  );

  /**
   * Applies the first feasible rule-based GA suggestion for a row (same engine as chairman conflict preview).
   * Updates `ScheduleEntry` and pings INS + evaluator listeners via {@link dispatchInsCatalogReload}.
   */
  const applyInsConflictAlternative = useCallback(
    async (entryId: string): Promise<{ ok: boolean; message: string }> => {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return { ok: false, message: "Schedule row not found." };
      if (entry.lockedByDoiAt) return { ok: false, message: "Schedule is locked after VPAA publication." };
      const periodId = entry.academicPeriodId;
      const termRows = entries.filter((e) => e.academicPeriodId === periodId);
      const roomIds = rooms.map((r) => r.id);
      const instructorIds = users
        .filter((u) => isPlottableFacultyUser(u))
        .map((u) => u.id);
      if (roomIds.length === 0 || instructorIds.length === 0) {
        return { ok: false, message: "Not enough rooms or instructors in catalog to suggest alternatives." };
      }
      const universeForGa = termRows.map(toScheduleBlock);
      const durationHours = slotDurationHours(entry.startTime, entry.endTime) || 2;
      const sug = runRuleBasedGeneticAlgorithm({
        universe: universeForGa,
        sectionId: entry.sectionId,
        subjectId: entry.subjectId,
        academicPeriodId: entry.academicPeriodId,
        excludeEntryId: entry.id,
        durationHours,
        fixedInstructorId: entry.instructorId,
        roomIds,
        instructorIds,
        generations: 28,
        populationSize: 40,
      })[0];
      if (!sug) return { ok: false, message: "No non-conflicting alternative found for this row." };

      try {
        await apiFetch(`/api/catalog/schedule-entries/${entryId}`, {
          method: "PATCH",
          body: {
            day: sug.day,
            startTime: sug.startTime,
            endTime: sug.endTime,
            roomId: sug.roomId,
            instructorId: sug.instructorId,
          },
        });
      } catch (e: any) {
        return { ok: false, message: e?.message ?? "Failed to update entry" };
      }

      dispatchInsCatalogReload();
      void loadScheduleEntriesForPeriod({ periodId, soft: true });
      return { ok: true, message: "Applied alternative slot from the rule-based resolver." };
    },
    [entries, rooms, users, loadScheduleEntriesForPeriod],
  );

  /** True when VPAA has published this term: any visible row for the term is locked (cross-college rows included). */
  const termPublishLocked = useMemo(() => {
    return entries
      .filter((e) => e.academicPeriodId === academicPeriodId)
      .some((e) => Boolean(e.lockedByDoiAt));
  }, [modeEntries, academicPeriodId]);

  const campusWideDirectorSignatureUrl = campusInsSettings?.campusDirectorSignatureImageUrl?.trim() || null;

  return {
    loading,
    error,
    periodLabel,
    periods,
    academicPeriodId,
    setAcademicPeriodId,
    /** Full term `ScheduleEntry` rows from Supabase (RLS-visible). Campus-wide instructor totals + conflict scan. */
    entries: modeEntries,
    scopedEntries,
    /** INS 5B/5C + pickers: campus-wide resources (within RLS), not the college/program slice alone. */
    insResourceEntries,
    subjectIdByCode,
    termPublishLocked,
    sectionById,
    subjectById,
    roomById,
    programById,
    colleges,
    users,
    userById,
    facultyProfileByUserId,
    instructorOptions,
    sectionOptions,
    roomOptions,
    getInsConflictSummaries,
    getInsConflictAlertText,
    runInsConflictCheck,
    getInsConflictLinesForInstructor,
    insConflictScan,
    insConflictingEntryIds,
    getFirstConflictingEntryIdForInstructor,
    getFirstConflictingEntryIdForSection,
    getFirstConflictingEntryIdForRoom,
    applyInsConflictAlternative,
    reload: load,
    campusInsSettings,
    campusWideDirectorSignatureUrl,
  };
}
