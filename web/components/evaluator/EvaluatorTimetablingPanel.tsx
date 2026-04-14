"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { defaultAcademicPeriodId, Q } from "@/lib/supabase/catalog-columns";
import { FACULTY_POLICY_CONSTANTS, PROGRAM_MAJORS, TIME_SLOT_OPTIONS, WEEKDAYS } from "@/lib/scheduling/constants";
import { detectConflictsForEntry, scanAllScheduleConflicts } from "@/lib/scheduling/conflicts";
import { evaluateFacultyLoadsForCollege } from "@/lib/scheduling/facultyPolicies";
import { runRuleBasedGeneticAlgorithm } from "@/lib/scheduling/ruleBasedGA";
import type { ConflictHit, GASuggestion, ScheduleBlock } from "@/lib/scheduling/types";
import type {
  AcademicPeriod,
  College,
  FacultyProfile,
  Program,
  Room,
  ScheduleEntry,
  ScheduleLoadJustification,
  Section,
  Subject,
  User,
} from "@/types/db";
import { Button } from "@/components/ui/button";
import { EvaluatorScheduleOverviewTable } from "@/components/evaluator/EvaluatorScheduleOverviewTable";
import { buildScheduleEvaluatorTableRows } from "@/lib/evaluator/schedule-evaluator-table";
import { ScheduleLivePreview } from "./ScheduleLivePreview";
import {
  type BsitSemester,
  isBsitChairmanProgram,
  isBsitSchedulingRoomCode,
  isBsitSectionName,
  normalizeProspectusCode,
  prospectusSubjectsForYearAndSemester,
  yearLevelFromBsitSectionName,
} from "@/lib/chairman/bsit-prospectus";
import { prospectusSemesterFromAcademicPeriod } from "@/lib/academic-period-prospectus";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";

function toBlock(e: ScheduleEntry): ScheduleBlock {
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

export type EvaluatorTimetablingPanelProps = {
  /** Chairman scope: fixed college; program is the only scope filter in the UI. */
  chairmanCollegeId: string | null;
  /** When set, UI is locked to this program (no college-wide or multi-program scope). */
  chairmanProgramId?: string | null;
  chairmanProgramCode?: string | null;
  chairmanProgramName?: string | null;
};

export function EvaluatorTimetablingPanel({
  chairmanCollegeId,
  chairmanProgramId = null,
  chairmanProgramCode = null,
  chairmanProgramName = null,
}: EvaluatorTimetablingPanelProps) {
  const { selectedPeriodId: academicPeriodId, selectedPeriod } = useSemesterFilter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [collegeUsers, setCollegeUsers] = useState<User[]>([]);
  const [facultyProfiles, setFacultyProfiles] = useState<FacultyProfile[]>([]);
  const [loadJustifications, setLoadJustifications] = useState<ScheduleLoadJustification[]>([]);
  const [dbEntries, setDbEntries] = useState<ScheduleEntry[]>([]);
  const [localDrafts, setLocalDrafts] = useState<ScheduleBlock[]>([]);

  const [collegeId, setCollegeId] = useState("");
  const [programId, setProgramId] = useState("");
  const [major, setMajor] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [day, setDay] = useState<string>("Monday");
  const [slotIndex, setSlotIndex] = useState(0);

  const [previewFocus, setPreviewFocus] = useState<"section" | "room" | "instructor">("section");
  const [conflicts, setConflicts] = useState<ConflictHit[]>([]);
  const [suggestions, setSuggestions] = useState<GASuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [justModalOpen, setJustModalOpen] = useState(false);
  const [justificationText, setJustificationText] = useState("");
  const [policySaving, setPolicySaving] = useState(false);
  const [altOpen, setAltOpen] = useState(false);
  const [altBusy, setAltBusy] = useState(false);
  const [altSuggestions, setAltSuggestions] = useState<GASuggestion[]>([]);
  const [fullConflictIds, setFullConflictIds] = useState<Set<string>>(() => new Set());
  const [fullConflictSummaries, setFullConflictSummaries] = useState<string[]>([]);
  const [fullConflictDetails, setFullConflictDetails] = useState<
    { entryId: string; type: string; message: string; relatedEntryId?: string }[]
  >([]);
  const [fullCheckRan, setFullCheckRan] = useState(false);
  const skipPeriodEntryFetchRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoadError("Supabase env missing.");
      setLoading(false);
      return;
    }
    skipPeriodEntryFetchRef.current = true;

    const { data: ap, error: e1 } = await supabase
      .from("AcademicPeriod")
      .select(Q.academicPeriod)
      .order("startDate", { ascending: false });
    if (e1) {
      setLoadError(e1.message);
      setLoading(false);
      return;
    }
    const periodList = (ap ?? []) as AcademicPeriod[];
    const periodId = academicPeriodId || defaultAcademicPeriodId(periodList);
    const schPromise = periodId
      ? supabase.from("ScheduleEntry").select(Q.scheduleEntry).eq("academicPeriodId", periodId)
      : Promise.resolve({ data: [] as ScheduleEntry[], error: null });
    const ljPromise = periodId
      ? supabase.from("ScheduleLoadJustification").select(Q.scheduleLoadJustification).eq("academicPeriodId", periodId)
      : Promise.resolve({ data: [] as ScheduleLoadJustification[], error: null });

    const [
      { data: col, error: e2 },
      { data: prog, error: e3 },
      { data: sec, error: e4 },
      { data: sub, error: e5 },
      { data: rm, error: e6 },
      { data: fac, error: e7 },
      { data: sch, error: e8 },
      { data: lj, error: e10 },
    ] = await Promise.all([
      supabase.from("College").select(Q.college).order("name"),
      supabase.from("Program").select(Q.program).order("name"),
      supabase.from("Section").select(Q.section).order("name"),
      supabase.from("Subject").select(Q.subject).order("code"),
      supabase.from("Room").select(Q.room).order("code"),
      supabase.from("User").select("id,email,name,role,collegeId,employeeId"),
      schPromise,
      ljPromise,
    ]);

    const err = e2 || e3 || e4 || e5 || e6 || e7 || e8 || e10;
    if (err) {
      setLoadError(err.message);
      setLoading(false);
      return;
    }

    const allUsers = (fac ?? []) as User[];
    const profileCandidateIds = allUsers
      .filter((u) => u.role === "instructor" || u.role === "chairman_admin")
      .map((u) => u.id);
    const { data: fp, error: e9 } =
      profileCandidateIds.length > 0
        ? await supabase.from("FacultyProfile").select(Q.facultyProfilePolicy).in("userId", profileCandidateIds)
        : { data: [] as FacultyProfile[], error: null };

    if (e9) {
      setLoadError(e9.message);
      setLoading(false);
      return;
    }

    setPeriods(periodList);
    setColleges((col ?? []) as College[]);
    setPrograms((prog ?? []) as Program[]);
    setSections((sec ?? []) as Section[]);
    setSubjects((sub ?? []) as Subject[]);
    setRooms((rm ?? []) as Room[]);
    setCollegeUsers(allUsers);
    setFacultyProfiles((fp ?? []) as FacultyProfile[]);
    setLoadJustifications((lj ?? []) as ScheduleLoadJustification[]);
    setDbEntries((sch ?? []) as ScheduleEntry[]);

    setLoading(false);
  }, [academicPeriodId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!academicPeriodId) return;
    if (skipPeriodEntryFetchRef.current) {
      skipPeriodEntryFetchRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;
      const [{ data: sch, error: e1 }, { data: lj, error: e2 }] = await Promise.all([
        supabase.from("ScheduleEntry").select(Q.scheduleEntry).eq("academicPeriodId", academicPeriodId),
        supabase.from("ScheduleLoadJustification").select(Q.scheduleLoadJustification).eq("academicPeriodId", academicPeriodId),
      ]);
      if (cancelled) return;
      if (e1 || e2) {
        setLoadError((e1 ?? e2)!.message);
        return;
      }
      setDbEntries((sch ?? []) as ScheduleEntry[]);
      setLoadJustifications((lj ?? []) as ScheduleLoadJustification[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [academicPeriodId]);

  useEffect(() => {
    if (chairmanCollegeId) setCollegeId(chairmanCollegeId);
  }, [chairmanCollegeId]);

  useEffect(() => {
    if (!chairmanProgramId) return;
    setProgramId(chairmanProgramId);
  }, [chairmanProgramId]);

  /** Chairman scope is fixed from the server; avoids one frame where collegeId state has not synced yet. */
  const effectiveCollegeId = chairmanCollegeId || collegeId;

  const programsInCollege = useMemo(() => {
    let list = programs.filter((p) => !effectiveCollegeId || p.collegeId === effectiveCollegeId);
    if (chairmanProgramId) list = list.filter((p) => p.id === chairmanProgramId);
    return list;
  }, [programs, effectiveCollegeId, chairmanProgramId]);

  const bsitScope =
    Boolean(chairmanProgramId) && isBsitChairmanProgram(chairmanProgramCode ?? undefined);

  const [bsitYearLevel, setBsitYearLevel] = useState(1);
  const [bsitSemester, setBsitSemester] = useState<BsitSemester>(1);

  /** BSIT plotting: align prospectus semester (1 vs 2) with the global AcademicPeriod selection in the shell. */
  useEffect(() => {
    if (!bsitScope) return;
    const s = prospectusSemesterFromAcademicPeriod(selectedPeriod);
    if (s != null) setBsitSemester(s);
  }, [bsitScope, selectedPeriod]);

  const sectionsInProgram = useMemo(
    () => sections.filter((s) => !programId || s.programId === programId),
    [sections, programId],
  );

  const sectionsForPlotter = useMemo(() => {
    let list = sectionsInProgram;
    if (bsitScope) list = list.filter((s) => isBsitSectionName(s.name));
    return list;
  }, [sectionsInProgram, bsitScope]);

  const subjectsInProgram = useMemo(
    () => subjects.filter((s) => !programId || s.programId === programId),
    [subjects, programId],
  );

  const subjectsForPlotter = useMemo(() => {
    let list = subjectsInProgram;
    if (bsitScope) {
      const allowed = new Set(
        prospectusSubjectsForYearAndSemester(bsitYearLevel, bsitSemester).map((p) =>
          normalizeProspectusCode(p.code),
        ),
      );
      list = list.filter((s) => allowed.has(normalizeProspectusCode(s.code)));
    }
    return list;
  }, [subjectsInProgram, bsitScope, bsitYearLevel, bsitSemester]);

  const roomsInCollege = useMemo(
    () =>
      rooms.filter(
        (r) => !effectiveCollegeId || r.collegeId === effectiveCollegeId || r.collegeId == null,
      ),
    [rooms, effectiveCollegeId],
  );

  const roomsForPlotter = useMemo(() => {
    let list = roomsInCollege;
    if (bsitScope) list = list.filter((r) => isBsitSchedulingRoomCode(r.code));
    return list;
  }, [roomsInCollege, bsitScope]);

  const instructorsInCollege = useMemo(() => {
    return collegeUsers.filter(
      (u) =>
        (!effectiveCollegeId || u.collegeId === effectiveCollegeId) &&
        (u.role === "instructor" || u.role === "chairman_admin"),
    );
  }, [collegeUsers, effectiveCollegeId]);

  const sectionToCollegeId = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sections) {
      const p = programs.find((pr) => pr.id === s.programId);
      if (p) map.set(s.id, p.collegeId);
    }
    return (sectionId: string) => map.get(sectionId) ?? null;
  }, [sections, programs]);

  const subjectById = useMemo(() => {
    const m = new Map<string, Subject>();
    subjects.forEach((s) => m.set(s.id, s));
    return m;
  }, [subjects]);

  const userById = useMemo(() => {
    const m = new Map<string, User>();
    collegeUsers.forEach((u) => m.set(u.id, u));
    return m;
  }, [collegeUsers]);

  const profileByUserId = useMemo(() => {
    const m = new Map<string, FacultyProfile>();
    facultyProfiles.forEach((p) => m.set(p.userId, p));
    return m;
  }, [facultyProfiles]);

  const sectionById = useMemo(() => {
    const m = new Map<string, Section>();
    sections.forEach((s) => m.set(s.id, s));
    return m;
  }, [sections]);

  useEffect(() => {
    if (!bsitScope || !sectionId) return;
    const sec = sectionById.get(sectionId);
    if (!sec) return;
    const y = yearLevelFromBsitSectionName(sec.name);
    if (y != null) setBsitYearLevel(y);
  }, [bsitScope, sectionId, sectionById]);

  useEffect(() => {
    if (!subjectId) return;
    if (!subjectsForPlotter.some((s) => s.id === subjectId)) {
      setSubjectId("");
    }
  }, [subjectsForPlotter, subjectId]);

  const programById = useMemo(() => {
    const m = new Map<string, Program>();
    programs.forEach((p) => m.set(p.id, p));
    return m;
  }, [programs]);

  const roomById = useMemo(() => {
    const m = new Map<string, Room>();
    rooms.forEach((r) => m.set(r.id, r));
    return m;
  }, [rooms]);

  const collegeNameById = useMemo(() => {
    const m = new Map<string, string>();
    colleges.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [colleges]);

  const mergedScheduleEntries = useMemo((): ScheduleEntry[] => {
    const fromLocal: ScheduleEntry[] = localDrafts.map((b) => ({
      id: b.id,
      academicPeriodId: b.academicPeriodId,
      subjectId: b.subjectId,
      instructorId: b.instructorId,
      sectionId: b.sectionId,
      roomId: b.roomId,
      day: b.day,
      startTime: b.startTime,
      endTime: b.endTime,
      status: "draft",
    }));
    return [...dbEntries, ...fromLocal];
  }, [dbEntries, localDrafts]);

  const mergedEntriesForPolicy = useMemo((): ScheduleEntry[] => {
    if (!academicPeriodId || !effectiveCollegeId) return [];
    const inCollege = (sId: string) => sectionToCollegeId(sId) === effectiveCollegeId;
    const inChairmanProgram = (sId: string) => {
      if (!chairmanProgramId) return true;
      const sec = sections.find((s) => s.id === sId);
      return sec?.programId === chairmanProgramId;
    };
    const keep = (sId: string) => inCollege(sId) && inChairmanProgram(sId);
    const fromDb = dbEntries.filter(
      (e) => e.academicPeriodId === academicPeriodId && keep(e.sectionId),
    );
    const fromLocal: ScheduleEntry[] = localDrafts
      .filter((b) => b.academicPeriodId === academicPeriodId && keep(b.sectionId))
      .map((b) => ({
        id: b.id,
        academicPeriodId: b.academicPeriodId,
        subjectId: b.subjectId,
        instructorId: b.instructorId,
        sectionId: b.sectionId,
        roomId: b.roomId,
        day: b.day,
        startTime: b.startTime,
        endTime: b.endTime,
        status: "draft",
      }));
    return [...fromDb, ...fromLocal];
  }, [
    dbEntries,
    localDrafts,
    academicPeriodId,
    effectiveCollegeId,
    sectionToCollegeId,
    chairmanProgramId,
    sections,
  ]);

  const policyEvaluation = useMemo(() => {
    if (!effectiveCollegeId) return { rows: [], hasAnyViolation: false };
    return evaluateFacultyLoadsForCollege(
      mergedEntriesForPolicy,
      subjectById,
      userById,
      profileByUserId,
      effectiveCollegeId,
      (sid) => sectionToCollegeId(sid),
    );
  }, [mergedEntriesForPolicy, subjectById, userById, profileByUserId, effectiveCollegeId, sectionToCollegeId]);

  useEffect(() => {
    const j = loadJustifications.find(
      (x) => x.academicPeriodId === academicPeriodId && x.collegeId === effectiveCollegeId,
    );
    setJustificationText(j?.justification ?? "");
  }, [academicPeriodId, effectiveCollegeId, loadJustifications]);

  const majorsForProgram = useMemo(() => {
    if (!programId) return [] as string[];
    return PROGRAM_MAJORS[programId] ?? ["General"];
  }, [programId]);

  const subjectCodeById = useMemo(() => {
    const m = new Map<string, string>();
    subjects.forEach((s) => m.set(s.id, s.code));
    return m;
  }, [subjects]);

  const roomCodeById = useMemo(() => {
    const m = new Map<string, string>();
    rooms.forEach((r) => m.set(r.id, r.code));
    return m;
  }, [rooms]);

  const instructorNameById = useMemo(() => {
    const m = new Map<string, string>();
    collegeUsers.forEach((u) => m.set(u.id, u.name));
    return m;
  }, [collegeUsers]);

  const sectionNameById = useMemo(() => {
    const m = new Map<string, string>();
    sections.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [sections]);

  const universe = useMemo(() => {
    const fromDb = dbEntries.map(toBlock);
    return [...fromDb, ...localDrafts];
  }, [dbEntries, localDrafts]);

  const scheduleTableRows = useMemo(() => {
    if (!chairmanCollegeId || !academicPeriodId) return [];
    return buildScheduleEvaluatorTableRows({
      entries: mergedScheduleEntries,
      academicPeriodId,
      scopeCollegeId: chairmanCollegeId,
      programId,
      sectionById,
      programById,
      subjectById,
      roomById,
      userById,
      collegeNameById,
    });
  }, [
    chairmanCollegeId,
    mergedScheduleEntries,
    academicPeriodId,
    programId,
    sectionById,
    programById,
    subjectById,
    roomById,
    userById,
    collegeNameById,
  ]);

  const scopeCollegeForConflicts = chairmanCollegeId || collegeId;

  const scopeBlocksForFullCheck = useMemo(() => {
    if (!academicPeriodId) return [] as ScheduleBlock[];
    const progFilter = chairmanProgramId || programId || null;
    return mergedScheduleEntries
      .filter((e) => e.academicPeriodId === academicPeriodId)
      .filter((e) => !scopeCollegeForConflicts || sectionToCollegeId(e.sectionId) === scopeCollegeForConflicts)
      .filter((e) => {
        if (!progFilter) return true;
        const sec = sectionById.get(e.sectionId);
        return sec?.programId === progFilter;
      })
      .map(toBlock);
  }, [
    mergedScheduleEntries,
    academicPeriodId,
    scopeCollegeForConflicts,
    chairmanProgramId,
    programId,
    sectionById,
    sectionToCollegeId,
  ]);

  useEffect(() => {
    setFullConflictIds(new Set());
    setFullConflictSummaries([]);
    setFullConflictDetails([]);
    setFullCheckRan(false);
  }, [academicPeriodId, scopeCollegeForConflicts, chairmanProgramId, programId]);

  function runFullConflictCheck() {
    const { conflictingEntryIds, issueSummaries, issues } = scanAllScheduleConflicts(scopeBlocksForFullCheck);
    setFullConflictIds(conflictingEntryIds);
    setFullConflictSummaries(issueSummaries);
    setFullConflictDetails(issues);
    setFullCheckRan(true);
  }

  const slot = TIME_SLOT_OPTIONS[slotIndex] ?? TIME_SLOT_OPTIONS[0]!;

  const candidate = useMemo((): ScheduleBlock | null => {
    if (!academicPeriodId || !sectionId || !subjectId || !instructorId || !roomId) return null;
    return {
      id: "pending",
      academicPeriodId,
      subjectId,
      instructorId,
      sectionId,
      roomId,
      day,
      startTime: slot.startTime,
      endTime: slot.endTime,
    };
  }, [academicPeriodId, sectionId, subjectId, instructorId, roomId, day, slot]);

  useEffect(() => {
    if (!candidate) {
      setConflicts([]);
      return;
    }
    const hits = detectConflictsForEntry(candidate, universe);
    setConflicts(hits);
  }, [candidate, universe]);

  const previewSectionEntries = useMemo(() => {
    if (!sectionId) return [];
    return universe.filter((e) => e.sectionId === sectionId && e.academicPeriodId === academicPeriodId);
  }, [universe, sectionId, academicPeriodId]);

  const previewRoomEntries = useMemo(() => {
    if (!roomId) return [];
    return universe.filter((e) => e.roomId === roomId && e.academicPeriodId === academicPeriodId);
  }, [universe, roomId, academicPeriodId]);

  const previewInstructorEntries = useMemo(() => {
    if (!instructorId) return [];
    return universe.filter((e) => e.instructorId === instructorId && e.academicPeriodId === academicPeriodId);
  }, [universe, instructorId, academicPeriodId]);

  function runGA() {
    if (!candidate) return;
    const roomIds = roomsForPlotter.map((r) => r.id);
    const instructorIds = instructorsInCollege.map((u) => u.id);
    if (roomIds.length === 0 || instructorIds.length === 0) return;

    const sug = runRuleBasedGeneticAlgorithm({
      universe,
      sectionId: candidate.sectionId,
      subjectId: candidate.subjectId,
      academicPeriodId: candidate.academicPeriodId,
      roomIds,
      instructorIds,
      generations: 40,
      populationSize: 56,
    });
    setSuggestions(sug);
    setShowSuggestions(true);
  }

  function applySuggestion(s: GASuggestion) {
    setDay(s.day);
    const idx = TIME_SLOT_OPTIONS.findIndex(
      (t) => t.startTime === s.startTime && t.endTime === s.endTime,
    );
    if (idx >= 0) setSlotIndex(idx);
    setRoomId(s.roomId);
    setInstructorId(s.instructorId);
    setShowSuggestions(false);
  }

  async function addPlot() {
    if (!candidate || conflicts.length > 0) return;
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`;
    const block: ScheduleBlock = { ...candidate, id };
    setLocalDrafts((prev) => [...prev, block]);
    setSaveMsg("Added to local draft. Click “Save to database” to persist.");
  }

  async function saveToDatabase() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    if (!academicPeriodId || !effectiveCollegeId) {
      setSaveMsg("Select academic period and college before saving.");
      return;
    }
    setSaveMsg(null);

    const rows = localDrafts.map((b) => ({
      id: b.id,
      academicPeriodId: b.academicPeriodId,
      subjectId: b.subjectId,
      instructorId: b.instructorId,
      sectionId: b.sectionId,
      roomId: b.roomId,
      day: b.day,
      startTime: b.startTime,
      endTime: b.endTime,
      status: "draft" as const,
    }));

    const hasAnyViolation = policyEvaluation.hasAnyViolation;

    if (hasAnyViolation) {
      const t = justificationText.trim();
      if (t.length < 12) {
        setJustModalOpen(true);
        setSaveMsg("Faculty load policies are exceeded. Enter a justification for the DOI (min. 12 characters).");
        return;
      }
    }

    setPolicySaving(true);
    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr || !user) {
        setSaveMsg("Not signed in.");
        return;
      }

      const author = collegeUsers.find((u) => u.id === user.id);
      const authorName = author?.name ?? user.email ?? user.id;

      if (hasAnyViolation) {
        const snapRows = policyEvaluation.rows
          .filter((r) => r.violations.length > 0)
          .map(
            (r) =>
              `${r.instructorName}: ${r.weeklyTotalContactHours.toFixed(1)} hrs/wk — ${r.violations.map((v) => v.code).join(", ")}`,
          );
        const summary = snapRows.join("\n");

        const { error: jErr } = await supabase.from("ScheduleLoadJustification").upsert(
          {
            academicPeriodId,
            collegeId: effectiveCollegeId,
            authorUserId: user.id,
            authorName,
            authorEmail: user.email ?? null,
            justification: justificationText.trim(),
            violationsSnapshot: { summary, detail: policyEvaluation.rows },
            /** Chair resubmits → VPAA must review again. */
            doiDecision: null,
            doiReviewedAt: null,
            doiReviewedById: null,
            doiReviewNote: null,
          },
          { onConflict: "academicPeriodId,collegeId" },
        );
        if (jErr) {
          setSaveMsg(jErr.message);
          return;
        }
      }

      const { error } = await supabase.from("ScheduleEntry").upsert(rows, { onConflict: "id" });
      if (error) {
        setSaveMsg(error.message);
        return;
      }

      dispatchInsCatalogReload();
      if (author?.role === "chairman_admin" && effectiveCollegeId) {
        void fetch("/api/audit/schedule-write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "chairman.evaluator_save",
            collegeId: effectiveCollegeId,
            academicPeriodId,
            details: { rowCount: rows.length },
          }),
        });
      }

      if (author?.role === "chairman_admin" && effectiveCollegeId && rows.length > 0) {
        const { data: admins } = await supabase
          .from("User")
          .select("id")
          .eq("role", "college_admin")
          .eq("collegeId", effectiveCollegeId);
        if (admins?.length) {
          const periodName =
            selectedPeriod?.name ?? periods.find((p) => p.id === academicPeriodId)?.name ?? "the current term";
          const msg = `${authorName} plotted or updated ${rows.length} schedule row(s) in the Evaluator (${periodName}). Open INS Form (Schedule View) and Evaluator to review.`;
          await supabase.from("Notification").insert(admins.map((a) => ({ userId: a.id, message: msg })));
        }
      }

      setLocalDrafts([]);
      setJustModalOpen(false);
      await load();
      setSaveMsg(
        hasAnyViolation
          ? "Schedule saved. Load policy justification recorded for DOI review."
          : "Schedule saved.",
      );
    } finally {
      setPolicySaving(false);
    }
  }

  async function saveJustificationOnly() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    if (!academicPeriodId || !effectiveCollegeId) return;
    const t = justificationText.trim();
    if (t.length < 12) {
      setSaveMsg("Enter at least 12 characters explaining the overload for DOI review.");
      return;
    }
    if (!policyEvaluation.hasAnyViolation) {
      setSaveMsg("No policy violations detected for this college and term.");
      return;
    }
    setPolicySaving(true);
    setSaveMsg(null);
    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr || !user) {
        setSaveMsg("Not signed in.");
        return;
      }
      const author = collegeUsers.find((u) => u.id === user.id);
      const authorName = author?.name ?? user.email ?? user.id;
      const snapRows = policyEvaluation.rows
        .filter((r) => r.violations.length > 0)
        .map(
          (r) =>
            `${r.instructorName}: ${r.weeklyTotalContactHours.toFixed(1)} hrs/wk — ${r.violations.map((v) => v.code).join(", ")}`,
        );
      const { error: jErr } = await supabase.from("ScheduleLoadJustification").upsert(
        {
          academicPeriodId,
          collegeId: effectiveCollegeId,
          authorUserId: user.id,
          authorName,
          authorEmail: user.email ?? null,
          justification: t,
          violationsSnapshot: { summary: snapRows.join("\n"), detail: policyEvaluation.rows },
          doiDecision: null,
          doiReviewedAt: null,
          doiReviewedById: null,
          doiReviewNote: null,
        },
        { onConflict: "academicPeriodId,collegeId" },
      );
      if (jErr) {
        setSaveMsg(jErr.message);
        return;
      }
      await load();
      setSaveMsg("Justification recorded for DOI review.");
    } finally {
      setPolicySaving(false);
    }
  }

  function runAlternativeSuggestion() {
    if (!academicPeriodId) return;
    const scopeId = effectiveCollegeId;
    const first = mergedScheduleEntries.find((e) => {
      if (e.academicPeriodId !== academicPeriodId) return false;
      const sec = sectionById.get(e.sectionId);
      if (!sec) return false;
      const pr = programById.get(sec.programId);
      if (!pr) return false;
      if (scopeId && pr.collegeId !== scopeId) return false;
      if (programId && sec.programId !== programId) return false;
      return true;
    });
    if (!first) {
      setAltSuggestions([]);
      setAltOpen(true);
      return;
    }
    const sec0 = sectionById.get(first.sectionId);
    const pr0 = sec0 ? programById.get(sec0.programId) : null;
    const cid = pr0?.collegeId ?? scopeId;
    if (!cid) {
      setAltSuggestions([]);
      setAltOpen(true);
      return;
    }
    const roomIds = (bsitScope ? roomsForPlotter : rooms.filter((r) => r.collegeId === cid || r.collegeId == null)).map(
      (r) => r.id,
    );
    const instructorIds = collegeUsers
      .filter((u) => u.collegeId === cid && (u.role === "instructor" || u.role === "chairman_admin"))
      .map((u) => u.id);
    if (roomIds.length === 0 || instructorIds.length === 0) {
      setAltSuggestions([]);
      setAltOpen(true);
      return;
    }
    setAltBusy(true);
    try {
      const sug = runRuleBasedGeneticAlgorithm({
        universe,
        sectionId: first.sectionId,
        subjectId: first.subjectId,
        academicPeriodId: first.academicPeriodId,
        roomIds,
        instructorIds,
        generations: 40,
        populationSize: 56,
      });
      setAltSuggestions(sug);
      setAltOpen(true);
    } finally {
      setAltBusy(false);
    }
  }

  const selectClass =
    "w-full h-11 rounded-lg border border-black/25 bg-white px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";

  if (loading) {
    return <div className="text-sm text-black/60">Loading catalog from Supabase…</div>;
  }
  if (loadError) {
    return <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{loadError}</div>;
  }

  return (
    <div className="space-y-6 min-w-0">
      {chairmanCollegeId === null ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Your profile is not linked to a college. Ask an administrator to set{" "}
          <code className="text-xs rounded bg-white/80 px-1">collegeId</code> on your User row so schedules can be
          scoped to your programs.
        </div>
      ) : null}

      {chairmanCollegeId && !chairmanProgramId ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Your chairman account has no <code className="text-xs rounded bg-white/80 px-1">chairmanProgramId</code>{" "}
          (assigned program). Ask an administrator to set it so RLS and the plotter lock to one program (e.g. BSIT).
        </div>
      ) : null}

      {chairmanCollegeId ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap gap-3 items-center">
              {chairmanProgramId ? (
                <div className="text-[13px] font-semibold text-black/70 flex flex-col gap-1">
                  Program (locked)
                  <span className="inline-flex items-center h-11 min-w-[220px] rounded-lg border border-black/20 bg-white px-3 text-sm shadow-sm">
                    {chairmanProgramCode ?? "—"}
                    {chairmanProgramName ? <span className="text-black/60 ml-1">— {chairmanProgramName}</span> : null}
                  </span>
                </div>
              ) : (
                <label className="text-[13px] font-semibold text-black/70">
                  Program
                  <select
                    className="ml-2 mt-1 h-11 min-w-[220px] rounded-lg border border-black/25 bg-white px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40"
                    value={programId}
                    onChange={(e) => {
                      setProgramId(e.target.value);
                      setSectionId("");
                      setSubjectId("");
                      setMajor("");
                    }}
                  >
                    <option value="">All programs</option>
                    {programsInCollege.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="text-[12px] text-black/55 max-w-sm">
                Academic term is selected in the header / sidebar.
              </p>
              <Button
                type="button"
                className="bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold h-11 px-5"
                disabled={altBusy}
                onClick={() => runAlternativeSuggestion()}
              >
                {altBusy ? "Working…" : "Alternative Suggestion"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 px-5 border-red-300 text-red-900 hover:bg-red-50 font-semibold"
                disabled={!academicPeriodId || scopeBlocksForFullCheck.length === 0}
                onClick={runFullConflictCheck}
              >
                Run full conflict check
              </Button>
            </div>
          </div>
          {fullCheckRan && fullConflictSummaries.length > 0 ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm space-y-2">
              <div className="font-semibold text-red-900">Conflicts in saved + draft rows (this term & scope)</div>
              <p className="text-[12px] text-red-900/85">
                Highlighted rows in the table below overlap in time and share the same instructor, room, or section.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-red-900">
                {fullConflictSummaries.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {fullConflictDetails.length > 0 ? (
                <details className="text-[12px] text-red-900/90">
                  <summary className="cursor-pointer font-medium">Affected entry ids</summary>
                  <ul className="mt-2 font-mono text-[11px] space-y-0.5 pl-2">
                    {fullConflictDetails.slice(0, 40).map((d, i) => (
                      <li key={`${d.entryId}-${i}`}>
                        {d.entryId.slice(0, 8)}… · {d.type}: {d.message}
                        {d.relatedEntryId ? ` (with ${d.relatedEntryId.slice(0, 8)}…)` : ""}
                      </li>
                    ))}
                    {fullConflictDetails.length > 40 ? (
                      <li>…and {fullConflictDetails.length - 40} more</li>
                    ) : null}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : fullCheckRan ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              No resource conflicts detected for this term and scope. Faculty load policy checks are in the plotting
              panel.
            </div>
          ) : academicPeriodId && scopeBlocksForFullCheck.length > 0 ? (
            <p className="text-[12px] text-black/50">
              Run <strong>Run full conflict check</strong> to validate all rows in the table for this term.
            </p>
          ) : null}
          <EvaluatorScheduleOverviewTable
            rows={scheduleTableRows}
            showCollegeColumn={false}
            highlightRowIds={fullConflictIds}
          />
        </>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] p-6 space-y-4">
          <div>
            <h3 className="text-[16px] font-semibold">Schedule plotting (dropdowns only)</h3>
            <p className="text-[12px] text-black/60 mt-1">
              Data is loaded from Supabase (academic periods, programs, sections, subjects, rooms, faculty).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {!chairmanCollegeId ? (
              <p className="text-sm text-black/55 md:col-span-2">
                Pick the academic term from the orange selector in the navigation bar.
              </p>
            ) : null}

            {!chairmanCollegeId ? (
              <label className="text-sm font-medium">
                College
                <select
                  className={`mt-1 ${selectClass}`}
                  value={collegeId}
                  onChange={(e) => {
                    setCollegeId(e.target.value);
                    setProgramId("");
                    setSectionId("");
                    setSubjectId("");
                    setMajor("");
                  }}
                >
                  <option value="">Select…</option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {!chairmanCollegeId ? (
              <label className="text-sm font-medium">
                Program
                <select
                  className={`mt-1 ${selectClass}`}
                  value={programId}
                  onChange={(e) => {
                    setProgramId(e.target.value);
                    setSectionId("");
                    setSubjectId("");
                    setMajor("");
                  }}
                >
                  <option value="">Select…</option>
                  {programsInCollege.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="text-sm font-medium">
              Major / field
              <select
                className={`mt-1 ${selectClass}`}
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                disabled={!programId}
              >
                <option value="">Select…</option>
                {majorsForProgram.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium">
              Section
              <select
                className={`mt-1 ${selectClass}`}
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={!programId}
              >
                <option value="">Select…</option>
                {sectionsForPlotter.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            {bsitScope ? (
              <label className="text-sm font-medium">
                Year level (BSIT prospectus)
                <select
                  className={`mt-1 ${selectClass}`}
                  value={bsitYearLevel}
                  onChange={(e) => {
                    setBsitYearLevel(parseInt(e.target.value, 10));
                    setSubjectId("");
                  }}
                  disabled={!programId}
                >
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </label>
            ) : null}

            <label className="text-sm font-medium">
              Subject code
              <select
                className={`mt-1 ${selectClass}`}
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={!programId}
              >
                <option value="">Select…</option>
                {subjectsForPlotter.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium">
              Instructor (faculty)
              <select
                className={`mt-1 ${selectClass}`}
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
                disabled={!effectiveCollegeId}
              >
                <option value="">Select…</option>
                {instructorsInCollege.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium">
              Room
              <select
                className={`mt-1 ${selectClass}`}
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                disabled={!effectiveCollegeId}
              >
                <option value="">Select…</option>
                {roomsForPlotter.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} ({r.type ?? "Room"})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium">
              Day
              <select className={`mt-1 ${selectClass}`} value={day} onChange={(e) => setDay(e.target.value)}>
                {WEEKDAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium">
              Time slot
              <select
                className={`mt-1 ${selectClass}`}
                value={slotIndex}
                onChange={(e) => setSlotIndex(parseInt(e.target.value, 10))}
              >
                {TIME_SLOT_OPTIONS.map((t, i) => (
                  <option key={t.label} value={i}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {conflicts.length > 0 ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm">
              <div className="font-semibold text-red-900 mb-2">Conflicts detected</div>
              <ul className="list-disc pl-5 space-y-1 text-red-800">
                {conflicts.map((c, i) => (
                  <li key={i}>
                    <span className="uppercase font-bold">{c.type}</span>: {c.message}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" className="bg-[#780301] hover:bg-[#5a0201] text-white" onClick={runGA}>
                  View alternative suggestions (rule-based GA)
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowSuggestions((s) => !s)}>
                  {showSuggestions ? "Hide" : "Show"} suggestions panel
                </Button>
              </div>
            </div>
          ) : candidate ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              No conflicts for this selection in the current term.
            </div>
          ) : (
            <div className="text-[13px] text-black/50">Complete all required fields to run conflict checks.</div>
          )}

          {showSuggestions && suggestions.length > 0 ? (
            <div className="rounded-lg border border-black/10 bg-white p-4">
              <div className="text-sm font-semibold mb-2">Suggested alternatives (genetic algorithm + rules)</div>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 border border-black/10 rounded-md p-2 text-sm"
                  >
                    <div>
                      {s.label} · Room {roomCodeById.get(s.roomId) ?? s.roomId} ·{" "}
                      {instructorNameById.get(s.instructorId) ?? s.instructorId}
                      <span className="text-black/50 ml-2"> (fitness {Math.round(s.fitness)})</span>
                    </div>
                    <Button type="button" size="sm" className="bg-[#ff990a] text-white" onClick={() => applySuggestion(s)}>
                      Apply
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {effectiveCollegeId && academicPeriodId ? (
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 p-4 text-sm space-y-3">
              <div className="font-semibold text-amber-950">Faculty load vs. CTU Faculty Manual (from timetable)</div>
              <p className="text-[12px] text-amber-950/80 leading-relaxed">
                Weekly contact is summed from plotted slots; lecture vs. lab split uses each subject&apos;s lec/lab hours.
                Standard teaching {FACULTY_POLICY_CONSTANTS.STANDARD_WEEKLY_TEACHING_HOURS} hrs/wk; lab cap{" "}
                {FACULTY_POLICY_CONSTANTS.MAX_WEEKLY_LAB_CONTACT_HOURS} hrs/wk; lecture overload track{" "}
                {FACULTY_POLICY_CONSTANTS.MAX_WEEKLY_LECTURE_OVERLOAD_HOURS} hrs/wk; part-time max{" "}
                {FACULTY_POLICY_CONSTANTS.PARTTIME_MAX_WEEKLY_HOURS} hrs/wk; heavy overload flag over{" "}
                {FACULTY_POLICY_CONSTANTS.MAX_WEEKLY_RESIDENT_CONTACT_HOURS} hrs/wk.
              </p>
              {policyEvaluation.rows.length === 0 ? (
                <p className="text-black/50 text-[13px]">No schedule rows for this college and term.</p>
              ) : (
                <div className="overflow-x-auto border border-amber-100 rounded-md bg-white">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-black/10 text-black/60">
                        <th className="p-2 font-medium">Faculty</th>
                        <th className="p-2 font-medium">Total hrs/wk</th>
                        <th className="p-2 font-medium">Lec / Lab</th>
                        <th className="p-2 font-medium">Status</th>
                        <th className="p-2 font-medium">Policy flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {policyEvaluation.rows.map((row) => (
                        <tr key={row.instructorId} className="border-b border-black/5">
                          <td className="p-2">{row.instructorName}</td>
                          <td className="p-2 tabular-nums">{row.weeklyTotalContactHours.toFixed(1)}</td>
                          <td className="p-2 tabular-nums text-black/70">
                            {row.weeklyLectureHours.toFixed(1)} / {row.weeklyLabHours.toFixed(1)}
                          </td>
                          <td className="p-2 text-black/70">{row.status ?? "—"}</td>
                          <td className="p-2">
                            {row.violations.length === 0 ? (
                              <span className="text-green-800">OK</span>
                            ) : (
                              <ul className="list-disc pl-4 text-amber-900 space-y-0.5">
                                {row.violations.map((v) => (
                                  <li key={v.code}>{v.message}</li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {policyEvaluation.hasAnyViolation ? (
                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-amber-950">
                    Justification for DOI / VPAA (required when saving drafts while policies are exceeded)
                    <textarea
                      className="mt-1 w-full min-h-[88px] rounded-md border border-amber-200 bg-white px-3 py-2 text-sm"
                      value={justificationText}
                      onChange={(e) => setJustificationText(e.target.value)}
                      placeholder="e.g. Temporary faculty shortage; VPAA-approved overload; split sections consolidated…"
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={policySaving}
                    onClick={() => void saveJustificationOnly()}
                  >
                    Save justification only (DOI)
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-[#ff990a] text-white"
              disabled={!candidate || conflicts.length > 0}
              onClick={() => void addPlot()}
            >
              Add to local draft
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void saveToDatabase()}
              disabled={localDrafts.length === 0 || policySaving}
            >
              Save drafts to database
            </Button>
          </div>
          {saveMsg ? <p className="text-[13px] text-black/70">{saveMsg}</p> : null}
          {localDrafts.length > 0 ? (
            <p className="text-[12px] text-black/60">
              {localDrafts.length} local draft row(s) pending save.
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["section", "room", "instructor"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setPreviewFocus(k)}
                className={`h-9 px-3 rounded-full text-sm font-semibold ${
                  previewFocus === k ? "bg-[#ff990a] text-white" : "bg-white border border-black/15"
                }`}
              >
                {k === "section" ? "Section" : k === "room" ? "Room" : "Instructor"} preview
              </button>
            ))}
          </div>
          {previewFocus === "section" ? (
            <ScheduleLivePreview
              title={`Section · ${sectionNameById.get(sectionId) ?? "—"} · ${selectedPeriod?.name ?? periods.find((p) => p.id === academicPeriodId)?.name ?? ""}`}
              entries={previewSectionEntries}
              subjectCodeById={subjectCodeById}
              roomCodeById={roomCodeById}
              instructorNameById={instructorNameById}
              sectionNameById={sectionNameById}
            />
          ) : null}
          {previewFocus === "room" ? (
            <ScheduleLivePreview
              title={`Room · ${roomCodeById.get(roomId) ?? "—"}`}
              entries={previewRoomEntries}
              subjectCodeById={subjectCodeById}
              roomCodeById={roomCodeById}
              instructorNameById={instructorNameById}
              sectionNameById={sectionNameById}
            />
          ) : null}
          {previewFocus === "instructor" ? (
            <ScheduleLivePreview
              title={`Instructor · ${instructorNameById.get(instructorId) ?? "—"}`}
              entries={previewInstructorEntries}
              subjectCodeById={subjectCodeById}
              roomCodeById={roomCodeById}
              instructorNameById={instructorNameById}
              sectionNameById={sectionNameById}
            />
          ) : null}
        </div>
      </div>

      {altOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-black/10"
            role="dialog"
            aria-modal="true"
          >
            <h2 className="text-lg font-semibold mb-2">Alternative suggestions</h2>
            <p className="text-sm text-black/65 mb-4">
              Rule-based optimization for the first scheduled row in the current program/term scope (same engine as the
              plotter).
            </p>
            {altSuggestions.length === 0 ? (
              <p className="text-sm text-black/55">No suggestions returned. Add rooms, faculty, and schedule rows.</p>
            ) : (
              <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
                {altSuggestions.slice(0, 6).map((s, i) => (
                  <li key={i} className="border border-black/10 rounded-md p-2">
                    {s.label}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end mt-6">
              <Button type="button" variant="outline" onClick={() => setAltOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {justModalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4 border border-black/10"
            role="dialog"
            aria-modal="true"
            aria-labelledby="just-modal-title"
          >
            <h2 id="just-modal-title" className="text-lg font-semibold">
              Faculty load justification
            </h2>
            <p className="text-sm text-black/70">
              This timetable exceeds Faculty Manual teaching-load rules. Enter a short justification for the DOI (minimum
              12 characters). Saving will record it with the schedule.
            </p>
            <textarea
              className="w-full min-h-[120px] rounded-lg border border-black/20 px-3 py-2 text-sm"
              value={justificationText}
              onChange={(e) => setJustificationText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setJustModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#780301] text-white"
                disabled={policySaving || justificationText.trim().length < 12}
                onClick={() => void saveToDatabase()}
              >
                Save with justification
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
