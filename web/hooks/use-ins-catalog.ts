"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useSemesterFilterOptional } from "@/contexts/SemesterFilterContext";
import { defaultAcademicPeriodId, Q } from "@/lib/supabase/catalog-columns";
import { normalizeProspectusCode } from "@/lib/chairman/bsit-prospectus";
import { INS_CATALOG_RELOAD_EVENT, subscribeScheduleEntryBroadcast } from "@/lib/ins/ins-catalog-reload";
import { formatUserInstructorLabel } from "@/lib/evaluator/instructor-employee-id";
import { insInstructorDisplayName } from "@/lib/ins/ins-instructor-display";
import { enrichCampusConflictIssues, conflictHeadlineShort } from "@/lib/scheduling/conflict-enrichment";
import { scanAllSparseScheduleConflicts, scheduleEntryToSparseBlock } from "@/lib/scheduling/conflicts";
import { formatGaSuggestionShortLabel } from "@/lib/scheduling/conflict-suggestion-label";
import { runRuleBasedGeneticAlgorithm } from "@/lib/scheduling/ruleBasedGA";
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
  };
}

export type InsInstructorOption = { id: string; name: string };
export type InsSectionOption = { id: string; name: string };
export type InsRoomOption = { id: string; name: string };

/**
 * Shared Supabase load + realtime for INS views (faculty / section / room).
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
   * When false, a chairman `programId` limits rows to that program only (Section/Room forms stay scoped).
   * Shared instructors must see the same Hours/Week as Evaluator policy (full college load).
   */
  ignoreProgramScope?: boolean;
}) {
  const semesterFilter = useSemesterFilterOptional();
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
  const skipPeriodEntryFetchRef = useRef(true);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;
      if (!soft) setLoading(true);
      const { data, error } = await supabase.from("ScheduleEntry").select(Q.scheduleEntry).eq("academicPeriodId", periodId);
      if (error) {
        setError(error.message);
        if (!soft) setLoading(false);
        return;
      }
      setEntries((data ?? []) as ScheduleEntry[]);
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
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    skipPeriodEntryFetchRef.current = true;
    const { data: ap, error: e1 } = await supabase
      .from("AcademicPeriod")
      .select(Q.academicPeriod)
      .order("startDate", { ascending: false });
    if (e1) {
      setError(e1.message);
      setLoading(false);
      return;
    }
    const periodList = (ap ?? []) as AcademicPeriod[];
    let periodId = "";
    if (semesterFilter?.ready && semesterFilter.selectedPeriodId) {
      periodId = semesterFilter.selectedPeriodId;
    } else if (!semesterFilter) {
      periodId = fallbackPeriodId || defaultAcademicPeriodId(periodList);
    } else {
      periodId = defaultAcademicPeriodId(periodList);
    }

    /**
     * Load term rows first so we can pull Section/Subject/Room/User rows referenced by **any** plotted class.
     * Without this, a chairman scoped to one college loses cross-college sections (e.g. GEC) and INS 5A under-counts
     * vs faculty My Schedule (which queries all `ScheduleEntry` for the instructor).
     */
    const schRes = periodId
      ? await supabase.from("ScheduleEntry").select(Q.scheduleEntry).eq("academicPeriodId", periodId)
      : { data: [] as ScheduleEntry[], error: null as null };
    if (schRes.error) {
      setError(schRes.error.message);
      setLoading(false);
      return;
    }
    const sch = (schRes.data ?? []) as ScheduleEntry[];
    const entrySectionIds = [...new Set(sch.map((e) => e.sectionId))];
    const entrySubjectIds = [...new Set(sch.map((e) => e.subjectId))];
    const entryRoomIds = [...new Set(sch.map((e) => e.roomId))];
    const entryInstructorIds = [...new Set(sch.map((e) => e.instructorId))];

    /**
     * Performance: When not campus-wide, primary catalog tables still anchor on the college’s programs; we merge
     * in term-referenced ids so shared faculty and cross-college sections resolve without loading every campus row.
     */
    const scopedCollegeId = args.campusWide ? null : args.collegeId?.trim() || null;
    let programIdsForScope: string[] = [];
    let prList: Program[] = [];
    if (scopedCollegeId) {
      const { data: pr, error: ep } = await supabase
        .from("Program")
        .select(Q.program)
        .eq("collegeId", scopedCollegeId)
        .order("name");
      if (ep) {
        setError(ep.message);
        setLoading(false);
        return;
      }
      prList = (pr ?? []) as Program[];
      programIdsForScope = prList.map((p) => p.id);
    }

    if (!scopedCollegeId) {
      const [
        { data: sec, error: e3 },
        { data: sub, error: e4 },
        { data: rm, error: e5 },
        { data: prog, error: e6 },
        { data: col, error: e8 },
        { data: fac, error: e7 },
        { data: ins, error: e9 },
        { data: fpIns, error: e10 },
      ] = await Promise.all([
        supabase.from("Section").select(Q.section).order("name"),
        supabase.from("Subject").select(Q.subject).order("code"),
        supabase.from("Room").select(Q.room).order("code"),
        supabase.from("Program").select(Q.program).order("name"),
        supabase.from("College").select(Q.college).order("name"),
        supabase.from("User").select(Q.userHub),
        supabase.from("CampusInsSettings").select(Q.campusInsSettings).eq("id", "default").maybeSingle(),
        supabase.from("FacultyProfile").select(Q.facultyProfileInsNames),
      ]);
      const err = e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10;
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      setPeriods(periodList);
      setEntries(sch);
      setSections((sec ?? []) as Section[]);
      setSubjects((sub ?? []) as Subject[]);
      setRooms((rm ?? []) as Room[]);
      setPrograms((prog ?? []) as Program[]);
      setColleges((col ?? []) as College[]);
      setUsers((fac ?? []) as User[]);
      setFacultyInsNames((fpIns ?? []) as Pick<FacultyProfile, "userId" | "fullName" | "aka">[]);
      setCampusInsSettings((ins as CampusInsSettings | null) ?? null);
      if (!semesterFilter && periodId) setFallbackPeriodId(periodId);
      setLoading(false);
      return;
    }

    const secCollegePromise =
      programIdsForScope.length > 0
        ? supabase.from("Section").select(Q.section).in("programId", programIdsForScope).order("name")
        : Promise.resolve({ data: [] as Section[], error: null });
    const secEntryPromise =
      entrySectionIds.length > 0
        ? supabase.from("Section").select(Q.section).in("id", entrySectionIds)
        : Promise.resolve({ data: [] as Section[], error: null });
    const subCollegePromise =
      programIdsForScope.length > 0
        ? supabase.from("Subject").select(Q.subject).in("programId", programIdsForScope).order("code")
        : Promise.resolve({ data: [] as Subject[], error: null });
    const subEntryPromise =
      entrySubjectIds.length > 0
        ? supabase.from("Subject").select(Q.subject).in("id", entrySubjectIds)
        : Promise.resolve({ data: [] as Subject[], error: null });
    const rmCollegePromise = supabase
      .from("Room")
      .select(Q.room)
      .or(`collegeId.eq.${scopedCollegeId},collegeId.is.null`)
      .order("code");
    const rmEntryPromise =
      entryRoomIds.length > 0
        ? supabase.from("Room").select(Q.room).in("id", entryRoomIds)
        : Promise.resolve({ data: [] as Room[], error: null });
    const facCollegePromise = supabase
      .from("User")
      .select(Q.userHub)
      .or(`collegeId.eq.${scopedCollegeId},collegeId.is.null`);
    const facEntryPromise =
      entryInstructorIds.length > 0
        ? supabase.from("User").select(Q.userHub).in("id", entryInstructorIds)
        : Promise.resolve({ data: [] as User[], error: null });

    const [
      { data: secCollege, error: eSecA },
      { data: secEntry, error: eSecB },
      { data: subCollege, error: eSubA },
      { data: subEntry, error: eSubB },
      { data: rmCollege, error: eRmA },
      { data: rmEntry, error: eRmB },
      { data: facCollege, error: eFacA },
      { data: facEntry, error: eFacB },
      { data: col, error: e8 },
      { data: ins, error: e9 },
      { data: fpIns, error: e10 },
    ] = await Promise.all([
      secCollegePromise,
      secEntryPromise,
      subCollegePromise,
      subEntryPromise,
      rmCollegePromise,
      rmEntryPromise,
      facCollegePromise,
      facEntryPromise,
      supabase.from("College").select(Q.college).order("name"),
      supabase.from("CampusInsSettings").select(Q.campusInsSettings).eq("id", "default").maybeSingle(),
      supabase.from("FacultyProfile").select(Q.facultyProfileInsNames),
    ]);
    const err =
      eSecA ||
      eSecB ||
      eSubA ||
      eSubB ||
      eRmA ||
      eRmB ||
      eFacA ||
      eFacB ||
      e8 ||
      e9 ||
      e10;
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    const sectionsMerged = mergeRowsById(
      (secCollege ?? []) as Section[],
      (secEntry ?? []) as Section[],
    );
    const subjectsMerged = mergeRowsById(
      (subCollege ?? []) as Subject[],
      (subEntry ?? []) as Subject[],
    );
    const roomsMerged = mergeRowsById((rmCollege ?? []) as Room[], (rmEntry ?? []) as Room[]);
    const usersMerged = mergeRowsById((facCollege ?? []) as User[], (facEntry ?? []) as User[]);

    const prIdSet = new Set(prList.map((p) => p.id));
    const extraProgIds = [
      ...new Set(sectionsMerged.map((s) => s.programId).filter((pid) => pid && !prIdSet.has(pid))),
    ];
    let programsFinal = prList;
    if (extraProgIds.length > 0) {
      const { data: extraPr, error: ePr } = await supabase.from("Program").select(Q.program).in("id", extraProgIds);
      if (ePr) {
        setError(ePr.message);
        setLoading(false);
        return;
      }
      programsFinal = [...prList, ...((extraPr ?? []) as Program[])];
    }

    setPeriods(periodList);
    setEntries(sch);
    setSections(sectionsMerged);
    setSubjects(subjectsMerged);
    setRooms(roomsMerged);
    setPrograms(programsFinal);
    setColleges((col ?? []) as College[]);
    setUsers(usersMerged);
    setFacultyInsNames((fpIns ?? []) as Pick<FacultyProfile, "userId" | "fullName" | "aka">[]);
    setCampusInsSettings((ins as CampusInsSettings | null) ?? null);
    if (!semesterFilter && periodId) setFallbackPeriodId(periodId);
    setLoading(false);
  }, [args.collegeId, args.campusWide, semesterFilter?.ready, semesterFilter?.selectedPeriodId, fallbackPeriodId]);

  useEffect(() => {
    void load();
  }, [load]);

  const scheduleDebouncedReload = useCallback(() => {
    if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
    /** Keep INS previews feeling near-real-time while still coalescing bursty DB events. */
    realtimeDebounceRef.current = setTimeout(() => void loadScheduleEntriesForPeriod({ soft: true }), 140);
  }, [loadScheduleEntriesForPeriod]);

  /**
   * Cross-user reflection fallback:
   * If Supabase Realtime is misconfigured (e.g., `ScheduleEntry` not in `supabase_realtime` publication),
   * other users won't receive `postgres_changes` events. A lightweight periodic refresh keeps INS views
   * consistent without forcing heavy catalog reloads.
   */
  useEffect(() => {
    if (!args.collegeId && !args.campusWide) return;
    if (!academicPeriodId) return;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void loadScheduleEntriesForPeriod({ soft: true });
    };
    /** Small jitter to avoid thundering herd if many clients are open. */
    const jitterMs = 400 + Math.round(Math.random() * 900);
    const id = window.setInterval(tick, 18_000 + jitterMs);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [args.collegeId, args.campusWide, academicPeriodId, loadScheduleEntriesForPeriod]);

  useEffect(() => {
    if (!args.collegeId && !args.campusWide) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const ch = supabase
      .channel("ins-schedule-entry")
      .on(
        "postgres_changes",
        academicPeriodId
          ? {
              event: "*",
              schema: "public",
              table: "ScheduleEntry",
              filter: `academicPeriodId=eq.${academicPeriodId}`,
            }
          : { event: "*", schema: "public", table: "ScheduleEntry" },
        () => scheduleDebouncedReload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "CampusInsSettings" },
        () => scheduleDebouncedReload(),
      )
      .subscribe();
    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      void supabase.removeChannel(ch);
    };
  }, [scheduleDebouncedReload, args.collegeId, args.campusWide, academicPeriodId]);

  /**
   * Same-tab refresh when GEC Chairman / Chairman saves `ScheduleEntry` (Realtime may be off).
   * Call `load()` immediately — no debounce — so Faculty / Section / Room INS views reflect new rows right away.
   * Realtime `postgres_changes` above stays debounced to avoid storms.
   */
  useEffect(() => {
    if (!args.collegeId && !args.campusWide) return;
    const handler = () => {
      void loadScheduleEntriesForPeriod({ soft: true });
    };
    if (typeof BroadcastChannel !== "undefined") {
      return subscribeScheduleEntryBroadcast(handler);
    }
    window.addEventListener(INS_CATALOG_RELOAD_EVENT, handler);
    return () => window.removeEventListener(INS_CATALOG_RELOAD_EVENT, handler);
  }, [loadScheduleEntriesForPeriod, args.collegeId, args.campusWide]);

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

  const scopedEntries = useMemo(() => {
    let base: ScheduleEntry[];
    if (args.campusWide) {
      base = entries.filter((e) => sectionById.has(e.sectionId));
    } else if (!args.collegeId) {
      base = entries;
    } else {
      base = entries.filter((e) => {
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
    entries,
    args.collegeId,
    args.programId,
    args.campusWide,
    args.ignoreProgramScope,
    args.instructorPortalUserId,
    sectionById,
    programById,
  ]);

  const termEntries = useMemo(
    () => scopedEntries.filter((e) => e.academicPeriodId === academicPeriodId),
    [scopedEntries, academicPeriodId],
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

  const instructorOptions: InsInstructorOption[] = useMemo(() => {
    const ids = new Set<string>();
    for (const e of termEntries) {
      ids.add(e.instructorId);
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
  }, [termEntries, users, facultyProfileByUserId]);

  const sectionOptions: InsSectionOption[] = useMemo(() => {
    const ids = new Set<string>();
    for (const e of termEntries) {
      ids.add(e.sectionId);
    }
    const list: InsSectionOption[] = [];
    for (const id of ids) {
      const s = sectionById.get(id);
      if (s) list.push({ id: s.id, name: s.name });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [termEntries, sectionById]);

  const roomOptions: InsRoomOption[] = useMemo(() => {
    const ids = new Set<string>();
    for (const e of termEntries) {
      ids.add(e.roomId);
    }
    const list: InsRoomOption[] = [];
    for (const id of ids) {
      const r = roomById.get(id);
      if (r) list.push({ id: r.id, name: r.code });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [termEntries, roomById]);

  const periodLabel = periods.find((p) => p.id === academicPeriodId)?.name ?? "";

  const collegeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of colleges) m.set(c.id, c.name);
    return m;
  }, [colleges]);

  /** Same scope as Evaluator grid: every `ScheduleEntry` row in this term (not only the INS college/program filter). */
  const getInsConflictSummaries = useCallback(() => {
    const blocks = entries
      .filter((e) => e.academicPeriodId === academicPeriodId)
      .map((e) => scheduleEntryToSparseBlock(e))
      .filter((b): b is NonNullable<typeof b> => b != null);
    return scanAllSparseScheduleConflicts(blocks).issueSummaries;
  }, [entries, academicPeriodId]);

  /** Full alert body: enriched causes + one GA-style suggestion per unique issue (when pools are available). */
  const getInsConflictAlertText = useCallback((): string => {
    if (!academicPeriodId) return "";
    const termRows = entries.filter((e) => e.academicPeriodId === academicPeriodId);
    const blocks = termRows
      .map((e) => scheduleEntryToSparseBlock(e))
      .filter((b): b is NonNullable<typeof b> => b != null);
    const scan = scanAllSparseScheduleConflicts(blocks);
    if (scan.issueSummaries.length === 0) return "";

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
      .filter((u) => u.role === "instructor" || u.role === "chairman_admin")
      .map((u) => u.id);

    const lines: string[] = [
      `Scanned ${termRows.length} schedule row(s) for this term (full campus master data).`,
      "",
    ];

    const seen = new Set<string>();
    let n = 0;
    for (const iss of enriched) {
      if (n >= 12) break;
      if (seen.has(iss.key)) continue;
      seen.add(iss.key);
      n += 1;
      lines.push(`• ${conflictHeadlineShort(iss)}`);
      lines.push(`  ${iss.rootCause}`);

      const entry = entryById.get(iss.rowA.entryId);
      if (entry && roomIds.length > 0 && instructorIds.length > 0) {
        const universeForGa = termRows.map(toScheduleBlock);
        const sug = runRuleBasedGeneticAlgorithm({
          universe: universeForGa,
          sectionId: entry.sectionId,
          subjectId: entry.subjectId,
          academicPeriodId: entry.academicPeriodId,
          excludeEntryId: entry.id,
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
          lines.push(`  Suggested fix: ${formatGaSuggestionShortLabel(best, { roomCode: rc, instructorDisplay: inst })}`);
        }
      }
      lines.push("");
    }

    return lines.join("\n").trim();
  }, [
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
  ]);

  /** True when VPAA has published this term: at least one scoped row carries lockedByDoiAt. */
  const termPublishLocked = useMemo(() => {
    return scopedEntries
      .filter((e) => e.academicPeriodId === academicPeriodId)
      .some((e) => Boolean(e.lockedByDoiAt));
  }, [scopedEntries, academicPeriodId]);

  const campusWideDirectorSignatureUrl = campusInsSettings?.campusDirectorSignatureImageUrl?.trim() || null;

  return {
    loading,
    error,
    periodLabel,
    periods,
    academicPeriodId,
    setAcademicPeriodId,
    /** Full term `ScheduleEntry` rows from Supabase (not college-filtered). Used by INS Form 5A for campus-wide hours. */
    entries,
    scopedEntries,
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
    reload: load,
    campusInsSettings,
    campusWideDirectorSignatureUrl,
  };
}
