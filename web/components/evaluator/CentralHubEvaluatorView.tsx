"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultAcademicPeriodId, Q } from "@/lib/supabase/catalog-columns";
import { useRouter, useSearchParams } from "next/navigation";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  CAMPUS_WIDE_COLLEGE_SLUG,
  CENTRAL_HUB_COLLEGES,
  hubCollegeBySlug,
  hubSlugForCollegeId,
} from "@/lib/evaluator-central-hub";
import { buildScheduleEvaluatorTableRows, formatTimeRange } from "@/lib/evaluator/schedule-evaluator-table";
import {
  buildConflictGridHints,
  enrichCampusConflictIssues,
  type CampusConflictScanApiPayload,
} from "@/lib/scheduling/conflict-enrichment";
import { scanAllSparseScheduleConflicts, scheduleEntryToSparseBlock } from "@/lib/scheduling/conflicts";
import { runRuleBasedGeneticAlgorithm } from "@/lib/scheduling/ruleBasedGA";
import { formatGaSuggestionShortLabel } from "@/lib/scheduling/conflict-suggestion-label";
import type { GASuggestion, ScheduleBlock } from "@/lib/scheduling/types";
import type {
  AcademicPeriod,
  College,
  FacultyProfile,
  Program,
  Room,
  ScheduleEntry,
  Section,
  Subject,
  User,
} from "@/types/db";
import { EvaluatorScheduleOverviewTable } from "@/components/evaluator/EvaluatorScheduleOverviewTable";
import {
  clearPendingCentralHubBundle,
  readPendingCentralHubBundle,
} from "@/lib/workflow-schedule-bundle";
import { HubEvaluatorTabs } from "@/components/evaluator/HubEvaluatorTabs";
import { HrsUnitsPrepsRemarksTable } from "@/components/evaluator/HrsUnitsPrepsRemarksTable";
import { DoiInsFormalApprovalPanel } from "@/components/doi/DoiInsFormalApprovalPanel";
import { DoiScheduleEntryQuickEditDialog } from "@/components/doi/DoiScheduleEntryQuickEditDialog";
import { EnrichedConflictIssuesPanel } from "@/components/campus-intelligence/EnrichedConflictIssuesPanel";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import { formatUserInstructorLabel } from "@/lib/evaluator/instructor-employee-id";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";
import { useScheduleEntryCrossReload } from "@/hooks/use-schedule-entry-cross-reload";
import { AlertTriangle } from "lucide-react";

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

export type CentralHubEvaluatorViewProps = {
  /** e.g. `/admin/college/evaluator` — used for hub tile links and back link */
  basePath: string;
  /** DOI Central Hub: campus-wide conflict scan + VPAA approval of the master schedule (all entries including GEC). */
  showDoiGovernance?: boolean;
};

export function CentralHubEvaluatorView({ basePath, showDoiGovernance = false }: CentralHubEvaluatorViewProps) {
  const { selectedPeriodId: academicPeriodId, setSelectedPeriodId: setAcademicPeriodId } = useSemesterFilter();
  const router = useRouter();
  const searchParams = useSearchParams();
  const collegeSlug = searchParams.get("college");
  const isCampusWide = collegeSlug?.toLowerCase() === CAMPUS_WIDE_COLLEGE_SLUG;
  const hub = hubCollegeBySlug(collegeSlug);
  const panel = searchParams.get("panel") === "hrs" ? "hrs" : "timetabling";
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [facultyProfiles, setFacultyProfiles] = useState<FacultyProfile[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);

  const [programId, setProgramId] = useState("");

  const [altOpen, setAltOpen] = useState(false);
  const [altSuggestions, setAltSuggestions] = useState<GASuggestion[]>([]);
  const [altBusy, setAltBusy] = useState(false);

  const [campusConflictScan, setCampusConflictScan] = useState<CampusConflictScanApiPayload | null>(null);
  /** GA picks for the first few enriched issues (computed on scan — capped for responsiveness). */
  const [hubConflictGaByIssueKey, setHubConflictGaByIssueKey] = useState<Record<string, GASuggestion[]>>({});
  const [conflictScanBusy, setConflictScanBusy] = useState(false);
  const [busyConflictApplyKey, setBusyConflictApplyKey] = useState<string | null>(null);
  const [focusEntryId, setFocusEntryId] = useState<string | null>(null);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const lastAppliedBundleAtRef = useRef<string | null>(null);
  const skipPeriodEntryFetchRef = useRef(true);
  const [hubBundleNotice, setHubBundleNotice] = useState<string | null>(null);

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

    const [
      { data: prog, error: e2 },
      { data: sec, error: e3 },
      { data: sub, error: e4 },
      { data: rm, error: e5 },
      { data: fac, error: e6 },
      { data: sch, error: e7 },
      { data: col, error: e8 },
    ] = await Promise.all([
      supabase.from("Program").select(Q.program).order("name"),
      supabase.from("Section").select(Q.section).order("name"),
      supabase.from("Subject").select(Q.subject).order("code"),
      supabase.from("Room").select(Q.room).order("code"),
      supabase.from("User").select("id,email,name,role,collegeId,employeeId"),
      schPromise,
      supabase.from("College").select(Q.college).order("name"),
    ]);
    const err = e2 || e3 || e4 || e5 || e6 || e7 || e8;
    if (err) {
      setLoadError(err.message);
      setLoading(false);
      return;
    }
    setPeriods(periodList);
    setPrograms((prog ?? []) as Program[]);
    setSections((sec ?? []) as Section[]);
    setSubjects((sub ?? []) as Subject[]);
    setRooms((rm ?? []) as Room[]);
    const allUsers = (fac ?? []) as User[];
    setUsers(allUsers);
    const profileCandidateIds = allUsers
      .filter((u) => u.role === "instructor" || u.role === "chairman_admin")
      .map((u) => u.id);
    const { data: fpRows, error: efp } =
      profileCandidateIds.length > 0
        ? await supabase.from("FacultyProfile").select(Q.facultyProfilePolicy).in("userId", profileCandidateIds)
        : { data: [] as FacultyProfile[], error: null };
    if (efp) {
      setLoadError(efp.message);
      setLoading(false);
      return;
    }
    setFacultyProfiles((fpRows ?? []) as FacultyProfile[]);
    setEntries((sch ?? []) as ScheduleEntry[]);
    setColleges((col ?? []) as College[]);
    setLoading(false);
  }, [academicPeriodId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Chairman / GEC saves + Realtime: keep this hub grid aligned with INS Forms without a manual refresh. */
  useScheduleEntryCrossReload(load, { academicPeriodId, enabled: Boolean(academicPeriodId) });

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
      const { data, error } = await supabase
        .from("ScheduleEntry")
        .select(Q.scheduleEntry)
        .eq("academicPeriodId", academicPeriodId);
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        return;
      }
      setEntries((data ?? []) as ScheduleEntry[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [academicPeriodId]);

  useEffect(() => {
    if (loading) return;
    const pending = readPendingCentralHubBundle();
    if (!pending || collegeSlug) return;
    const slug = hubSlugForCollegeId(pending.collegeId) ?? CAMPUS_WIDE_COLLEGE_SLUG;
    router.replace(`${basePath}?college=${encodeURIComponent(slug)}`);
  }, [loading, collegeSlug, router, basePath]);

  useEffect(() => {
    if (loading || !collegeSlug) return;
    const pending = readPendingCentralHubBundle();
    if (!pending) return;
    if (pending.createdAt === lastAppliedBundleAtRef.current) return;

    const isWide = collegeSlug.toLowerCase() === CAMPUS_WIDE_COLLEGE_SLUG;
    const hub = hubCollegeBySlug(collegeSlug);
    if (!isWide && hub?.collegeId && hub.collegeId !== pending.collegeId) {
      setHubBundleNotice(
        `Workflow bundle is for college “${pending.collegeId}”. Open that hub tile or campus-wide to merge INS-linked schedule rows.`,
      );
      return;
    }

    lastAppliedBundleAtRef.current = pending.createdAt;
    clearPendingCentralHubBundle();

    if (periods.some((p) => p.id === pending.academicPeriodId)) {
      skipPeriodEntryFetchRef.current = true;
      setAcademicPeriodId(pending.academicPeriodId);
    }
    if (pending.programId && programs.some((p) => p.id === pending.programId)) {
      setProgramId(pending.programId);
    }

    setEntries((prev) => {
      const m = new Map(prev.map((e) => [e.id, e]));
      for (const e of pending.scheduleEntries) {
        m.set(e.id, { ...e });
      }
      return Array.from(m.values());
    });

    const progName =
      pending.programId && programs.length > 0
        ? (programs.find((p) => p.id === pending.programId)?.name ?? pending.programId)
        : "all programs in scope";

    setHubBundleNotice(
      `Imported ${pending.scheduleEntries.length} schedule row(s) from the Chairman workflow bundle (INS + Evaluator). ` +
        `Organized under college scope “${isWide ? "All colleges" : hub?.name ?? collegeSlug}” · Department filter: ${progName}.`,
    );
  }, [loading, collegeSlug, periods, programs]);

  useEffect(() => {
    setCampusConflictScan(null);
    setHubConflictGaByIssueKey({});
    setFocusEntryId(null);
  }, [academicPeriodId]);

  useEffect(() => {
    if (!focusEntryId) return;
    const el = document.getElementById(`central-eval-row-${focusEntryId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusEntryId]);

  /** null = all colleges (campus-wide); string = one college in DB */
  const scopeCollegeId = isCampusWide ? null : hub?.collegeId ?? null;

  const programsInCollege = useMemo(
    () => programs.filter((p) => !scopeCollegeId || p.collegeId === scopeCollegeId),
    [programs, scopeCollegeId],
  );

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

  const userById = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const facultyProfileByUserId = useMemo(() => {
    const m = new Map<string, FacultyProfile>();
    facultyProfiles.forEach((p) => m.set(p.userId, p));
    return m;
  }, [facultyProfiles]);

  const sectionById = useMemo(() => {
    const m = new Map<string, Section>();
    sections.forEach((s) => m.set(s.id, s));
    return m;
  }, [sections]);

  const programById = useMemo(() => {
    const m = new Map<string, Program>();
    programs.forEach((p) => m.set(p.id, p));
    return m;
  }, [programs]);

  const universe = useMemo(() => entries.map(toBlock), [entries]);

  const suggestAlternativesForEntry = useCallback(
    (entryId: string) => {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry || entry.academicPeriodId !== academicPeriodId) return [];
      const sec = sectionById.get(entry.sectionId);
      const pr = sec ? programById.get(sec.programId) : null;
      const cid = pr?.collegeId;
      if (!cid) return [];
      const roomIds = rooms.filter((r) => !r.collegeId || r.collegeId === cid).map((r) => r.id);
      const instructorIds = users
        .filter((u) => u.collegeId === cid && (u.role === "instructor" || u.role === "chairman_admin"))
        .map((u) => u.id);
      if (roomIds.length === 0 || instructorIds.length === 0) return [];
      return runRuleBasedGeneticAlgorithm({
        universe,
        sectionId: entry.sectionId,
        subjectId: entry.subjectId,
        academicPeriodId: entry.academicPeriodId,
        excludeEntryId: entry.id,
        roomIds,
        instructorIds,
        generations: 40,
        populationSize: 56,
      });
    },
    [entries, academicPeriodId, sectionById, programById, rooms, users, universe],
  );

  const campusConflictHighlightIds = useMemo(() => {
    if (!campusConflictScan?.conflictingEntryIds?.length) return undefined;
    return new Set(campusConflictScan.conflictingEntryIds);
  }, [campusConflictScan]);

  const conflictDetailsByRowId = useMemo(() => {
    if (!campusConflictScan?.enrichedIssues?.length) return undefined;
    return buildConflictGridHints(campusConflictScan.enrichedIssues);
  }, [campusConflictScan]);

  const editEntry = useMemo(
    () => (editEntryId ? entries.find((e) => e.id === editEntryId) ?? null : null),
    [editEntryId, entries],
  );

  const editCollegeId = useMemo(() => {
    if (!editEntry) return null;
    const sec = sectionById.get(editEntry.sectionId);
    const pr = sec ? programById.get(sec.programId) : null;
    return pr?.collegeId ?? null;
  }, [editEntry, sectionById, programById]);

  const roomsForEdit = useMemo(() => {
    if (!editCollegeId) return rooms;
    return rooms.filter((r) => !r.collegeId || r.collegeId === editCollegeId);
  }, [rooms, editCollegeId]);

  const instructorsForEdit = useMemo(() => {
    if (!editCollegeId) return users.filter((u) => u.role === "instructor" || u.role === "chairman_admin");
    return users.filter(
      (u) =>
        u.collegeId === editCollegeId && (u.role === "instructor" || u.role === "chairman_admin"),
    );
  }, [users, editCollegeId]);

  const collegeNameById = useMemo(() => {
    const m = new Map<string, string>();
    colleges.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [colleges]);

  /**
   * Scoped conflict scan for the hub grid (respects college + program filters). Precomputes a few GA alternatives
   * per issue for one-click apply — same enrichment model as the dashboard banner.
   */
  const runScopedConflictScan = useCallback(() => {
    if (!academicPeriodId) return;
    setConflictScanBusy(true);
    try {
      const scoped = entries.filter((e) => {
        if (e.academicPeriodId !== academicPeriodId) return false;
        if (scopeCollegeId == null) {
          if (programId) {
            const sec = sectionById.get(e.sectionId);
            return sec?.programId === programId;
          }
          return true;
        }
        const sec = sectionById.get(e.sectionId);
        const pr = sec ? programById.get(sec.programId) : null;
        if (pr?.collegeId !== scopeCollegeId) return false;
        if (programId && sec?.programId !== programId) return false;
        return true;
      });
      if (scoped.length === 0) {
        setCampusConflictScan({
          entryCount: 0,
          conflictingEntryIds: [],
          issueSummaries: [],
          issues: [],
          enrichedIssues: [],
        });
        setHubConflictGaByIssueKey({});
        return;
      }
      const sparseBlocks = scoped
        .map((e) => scheduleEntryToSparseBlock(e))
        .filter((b): b is NonNullable<typeof b> => b != null);
      const scan = scanAllSparseScheduleConflicts(sparseBlocks);
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
      setCampusConflictScan({
        entryCount: sparseBlocks.length,
        conflictingEntryIds: [...scan.conflictingEntryIds],
        issueSummaries: scan.issueSummaries,
        issues: scan.issues,
        enrichedIssues: enriched,
      });
      const gaMap: Record<string, GASuggestion[]> = {};
      for (const iss of enriched.slice(0, 12)) {
        gaMap[iss.key] = suggestAlternativesForEntry(iss.rowA.entryId).slice(0, 5);
      }
      setHubConflictGaByIssueKey(gaMap);
    } finally {
      setConflictScanBusy(false);
    }
  }, [
    academicPeriodId,
    entries,
    scopeCollegeId,
    programId,
    sectionById,
    programById,
    subjectById,
    roomById,
    userById,
    collegeNameById,
    suggestAlternativesForEntry,
  ]);

  const tableRows = useMemo(() => {
    if (!academicPeriodId) return [];
    return buildScheduleEvaluatorTableRows({
      entries,
      academicPeriodId,
      scopeCollegeId,
      programId,
      sectionById,
      programById,
      subjectById,
      roomById,
      userById,
      facultyProfileByUserId,
      collegeNameById,
    });
  }, [
    entries,
    scopeCollegeId,
    academicPeriodId,
    programId,
    sectionById,
    subjectById,
    roomById,
    userById,
    facultyProfileByUserId,
    programById,
    collegeNameById,
  ]);

  /** Dashboard deep link: ?conflicts=1&focusEntry=<id> — same scan as the explicit Run conflict check button. */
  const conflictDeepLinkRanRef = useRef<string | null>(null);
  useEffect(() => {
    if (searchParams.get("conflicts") !== "1" || loading || !academicPeriodId) return;
    const key = `${academicPeriodId}:${searchParams.toString()}`;
    if (conflictDeepLinkRanRef.current === key) return;
    runScopedConflictScan();
    const fe = searchParams.get("focusEntry")?.trim();
    if (fe) setFocusEntryId(fe);
    conflictDeepLinkRanRef.current = key;
  }, [searchParams, loading, academicPeriodId, runScopedConflictScan]);

  function runAlternativeSuggestion() {
    if (!academicPeriodId) return;
    const first = entries.find((e) => {
      if (e.academicPeriodId !== academicPeriodId) return false;
      const sec = sectionById.get(e.sectionId);
      if (!sec) return false;
      const pr = programById.get(sec.programId);
      if (!pr) return false;
      if (scopeCollegeId && pr.collegeId !== scopeCollegeId) return false;
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
    const cid = pr0?.collegeId ?? scopeCollegeId;
    if (!cid) {
      setAltSuggestions([]);
      setAltOpen(true);
      return;
    }
    const roomIds = rooms.filter((r) => r.collegeId === cid || r.collegeId == null).map((r) => r.id);
    const instructorIds = users
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

  /** Apply a GA suggestion to the primary row in a conflict pair (updates Supabase + reloads grid). */
  const applyHubConflictSuggestion = useCallback(
    async (issueKey: string, s: GASuggestion) => {
      const iss = campusConflictScan?.enrichedIssues.find((i) => i.key === issueKey);
      if (!iss) return;
      setBusyConflictApplyKey(issueKey);
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
        setCampusConflictScan(null);
        setHubConflictGaByIssueKey({});
        setFocusEntryId(null);
        await load();
        dispatchInsCatalogReload();
        const touched = entries.find((e) => e.id === iss.rowA.entryId);
        const sec0 = touched ? sectionById.get(touched.sectionId) : undefined;
        const pr0 = sec0 ? programById.get(sec0.programId) : null;
        const sub0 = touched ? subjectById.get(touched.subjectId) : undefined;
        void fetch("/api/audit/schedule-write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "hub.conflict_apply",
            collegeId: pr0?.collegeId ?? scopeCollegeId,
            academicPeriodId: touched?.academicPeriodId ?? academicPeriodId,
            details: {
              entryId: iss.rowA.entryId,
              issueKey,
              subjectCode: sub0?.code ?? "",
              sectionName: sec0?.name ?? "",
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
        /** Re-run the scoped scan so the UI confirms the GA pick did not leave a new overlap in this view. */
        runScopedConflictScan();
      } finally {
        setBusyConflictApplyKey(null);
      }
    },
    [
      campusConflictScan,
      load,
      entries,
      sectionById,
      subjectById,
      programById,
      scopeCollegeId,
      academicPeriodId,
      runScopedConflictScan,
    ],
  );

  /* —— Hub: college tiles —— */
  if (!collegeSlug) {
    return (
      <div>
        <ChairmanPageHeader
          title="Central Hub Evaluator"
          subtitle="High-level view of today's academic activity and room usage."
        />
        <div className="px-4 md:px-8 pb-12 max-w-4xl mx-auto">
          <HubEvaluatorTabs basePath={basePath} collegeSlug={null} panel="timetabling" />
          <p className="text-[14px] text-black/70 mb-8 text-center">
            Campus-wide scope — select one college or <strong>all colleges</strong> to search and filter by department.
          </p>
          <div className="mb-4 flex justify-center">
            <Link
              href={`${basePath}?college=${CAMPUS_WIDE_COLLEGE_SLUG}`}
              className="inline-flex items-center justify-center min-h-[56px] rounded-[20px] bg-[#780301] text-white font-bold text-[14px] px-8 py-3 shadow-[0px_4px_4px_rgba(0,0,0,0.15)] hover:brightness-110 transition-[filter]"
            >
              All colleges (campus-wide timetable)
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {CENTRAL_HUB_COLLEGES.slice(0, 4).map((c) => (
              <Link
                key={c.slug}
                href={`${basePath}?college=${c.slug}`}
                className="flex items-center justify-center min-h-[72px] rounded-[20px] bg-[#ff990a] text-white font-bold text-[15px] text-center px-6 py-5 shadow-[0px_4px_4px_rgba(0,0,0,0.15)] hover:brightness-105 transition-[filter]"
              >
                {c.name}
              </Link>
            ))}
          </div>
          {CENTRAL_HUB_COLLEGES[4] ? (
            <div className="flex justify-center mt-5">
              <Link
                href={`${basePath}?college=${CENTRAL_HUB_COLLEGES[4]!.slug}`}
                className="flex items-center justify-center w-full sm:max-w-[calc(50%-10px)] min-h-[72px] rounded-[20px] bg-[#ff990a] text-white font-bold text-[15px] text-center px-6 py-5 shadow-[0px_4px_4px_rgba(0,0,0,0.15)] hover:brightness-105 transition-[filter]"
              >
                {CENTRAL_HUB_COLLEGES[4]!.name}
              </Link>
            </div>
          ) : null}
          <p className="text-[12px] text-black/45 mt-8 text-center">
            College Admin, CAS Admin, and DOI Admin use this hub to review schedules across colleges.
          </p>
        </div>
      </div>
    );
  }

  if (collegeSlug && !isCampusWide && !hub) {
    return (
      <div>
        <ChairmanPageHeader title="Central Hub Evaluator" subtitle="Invalid college selection." />
        <div className="px-4 md:px-8 pb-8">
          <Link href={basePath} className="text-[13px] font-semibold text-[#780301] hover:underline">
            ← Back to college hub
          </Link>
        </div>
      </div>
    );
  }

  if (!isCampusWide && hub && !hub.collegeId) {
    return (
      <div>
        <ChairmanPageHeader title="Central Hub Evaluator" subtitle={hub.name} />
        <div className="px-4 md:px-8 pb-8">
          <Link href={basePath} className="text-[13px] font-semibold text-[#780301] hover:underline mb-4 inline-block">
            ← All colleges
          </Link>
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-[14px] text-amber-950">
            <strong>{hub.abbr}</strong> is not linked to database rows yet. Add this college in Supabase{" "}
            <code className="text-xs bg-white/80 px-1 rounded">public.&quot;College&quot;</code> and set{" "}
            <code className="text-xs bg-white/80 px-1">collegeId</code> in{" "}
            <code className="text-xs bg-white/80 px-1">lib/evaluator-central-hub.ts</code>.
          </div>
        </div>
      </div>
    );
  }

  const collegeRow = scopeCollegeId ? colleges.find((c) => c.id === scopeCollegeId) : null;

  return (
    <div>
      <ChairmanPageHeader
        title="Central Hub Evaluator"
        subtitle="Campus-wide data — narrow by college and department (program)."
      />

      <div className="px-4 md:px-8 pb-8">
        <HubEvaluatorTabs basePath={basePath} collegeSlug={collegeSlug} panel={panel} />
        {hubBundleNotice ? (
          <div className="mb-4 rounded-lg border border-[#FF990A]/50 bg-[#FF990A]/10 px-4 py-3 text-[13px] text-gray-900">
            {hubBundleNotice}
            <button
              type="button"
              className="ml-3 text-[#780301] font-semibold underline"
              onClick={() => setHubBundleNotice(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Link href={basePath} className="text-[13px] font-semibold text-[#780301] hover:underline">
            ← College hub
          </Link>
          <span className="text-[13px] text-black/55">
            Scope:{" "}
            <strong className="text-black/80">
              {isCampusWide ? "All colleges (campus-wide)" : collegeRow?.name ?? hub?.name ?? "—"}
            </strong>
          </span>
        </div>

        {panel === "timetabling" ? (
          <>
            {showDoiGovernance ? (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-[13px] text-gray-900">
                <strong className="text-gray-950">View campus-wide schedule (including GEC subjects):</strong> set{" "}
                <em>College</em> to <strong>All colleges (campus-wide)</strong> in the dropdown below. The grid lists
                every <code className="text-xs bg-white/80 px-1 rounded">ScheduleEntry</code> for the selected term
                across programs. Use the VPAA panel to run a full conflict scan and approve the entire schedule for the
                term.
              </div>
            ) : null}

            {showDoiGovernance && academicPeriodId ? (
              <DoiInsFormalApprovalPanel
                periodId={academicPeriodId}
                periods={periods}
                onPeriodIdChange={setAcademicPeriodId}
                reloadCatalog={() => void load()}
                onConflictScanComplete={setCampusConflictScan}
                gridIntegration={{
                  onFocusEntry: (id) => setFocusEntryId(id),
                  suggestAlternativesForEntry,
                  applySchedulePatch: async (id, patch) => {
                    const supabase = createSupabaseBrowserClient();
                    if (!supabase) throw new Error("Supabase not configured");
                    const { error } = await supabase.from("ScheduleEntry").update(patch).eq("id", id);
                    if (error) throw new Error(error.message);
                    setCampusConflictScan(null);
                    setFocusEntryId(null);
                    await load();
                    dispatchInsCatalogReload();
                    const anchor = entries.find((x) => x.id === id);
                    const sec = anchor ? sectionById.get(anchor.sectionId) : undefined;
                    const pr = sec ? programById.get(sec.programId) : null;
                    const sub = anchor ? subjectById.get(anchor.subjectId) : undefined;
                    void fetch("/api/audit/schedule-write", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "hub.schedule_quick_patch",
                        collegeId: pr?.collegeId ?? scopeCollegeId,
                        academicPeriodId: anchor?.academicPeriodId ?? academicPeriodId,
                        details: {
                          entryId: id,
                          subjectCode: sub?.code ?? "",
                          sectionName: sec?.name ?? "",
                          patch,
                        },
                      }),
                    });
                  },
                  formatGaSuggestion: (s, anchorEntryId) => {
                    const e = entries.find((x) => x.id === anchorEntryId);
                    const sec = e ? sectionById.get(e.sectionId) : undefined;
                    const sub = e ? subjectById.get(e.subjectId) : undefined;
                    const room = roomById.get(s.roomId);
                    const fac = userById.get(s.instructorId);
                    return {
                      what: `${sub?.code ?? "—"} · ${sec?.name ?? "—"}`,
                      when: `${s.day} ${formatTimeRange(s.startTime, s.endTime)}`,
                      where: room?.code ?? s.roomId,
                      who: formatUserInstructorLabel(fac, facultyProfileByUserId.get(s.instructorId)),
                    };
                  },
                }}
              />
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <label className="block min-w-[200px]">
                <span className="text-[13px] font-semibold text-black/70">College</span>
                <select
                  className="mt-1 w-full h-11 rounded-lg border border-black/25 bg-white px-3 text-sm shadow-sm"
                  value={
                    isCampusWide
                      ? CAMPUS_WIDE_COLLEGE_SLUG
                      : scopeCollegeId
                        ? hubSlugForCollegeId(scopeCollegeId) ?? collegeSlug ?? ""
                        : collegeSlug ?? ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    const keepHrs = searchParams.get("panel") === "hrs";
                    const q = keepHrs ? "&panel=hrs" : "";
                    router.replace(`${basePath}?college=${encodeURIComponent(v)}${q}`);
                  }}
                >
                  <option value={CAMPUS_WIDE_COLLEGE_SLUG}>All colleges (campus-wide)</option>
                  {CENTRAL_HUB_COLLEGES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.abbr} — {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-[200px]">
                <span className="text-[13px] font-semibold text-black/70">Department (program)</span>
                <select
                  className="mt-1 w-full h-11 rounded-lg border border-black/25 bg-white px-3 text-sm shadow-sm"
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                >
                  <option value="">All departments</option>
                  {programsInCollege.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
              <div className="flex flex-wrap gap-3 items-center">
                <p className="text-[12px] text-black/55 max-w-md">
                  Academic term is selected in the sidebar / header. Change it there to filter this grid.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-5 border-amber-300 font-bold text-red-900 bg-white"
                  disabled={loading || conflictScanBusy || !academicPeriodId}
                  onClick={() => runScopedConflictScan()}
                >
                  <AlertTriangle className="w-4 h-4 mr-2 inline" aria-hidden />
                  {conflictScanBusy ? "Scanning…" : "Run conflict check"}
                </Button>
                <Button
                  type="button"
                  className="bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold h-11 px-5"
                  disabled={altBusy || loading}
                  onClick={() => runAlternativeSuggestion()}
                >
                  {altBusy ? "Working…" : "Alternative Suggestion"}
                </Button>
              </div>
            </div>

            {campusConflictScan && campusConflictScan.enrichedIssues.length > 0 ? (
              <div className="mb-4">
                <EnrichedConflictIssuesPanel
                  title="Conflicts & suggested fixes (scoped hub scan)"
                  issues={campusConflictScan.enrichedIssues}
                  suggestionsByIssueKey={hubConflictGaByIssueKey}
                  busyIssueKey={busyConflictApplyKey}
                  onApplySuggestion={(key, s) => void applyHubConflictSuggestion(key, s)}
                  allowApply
                  maxIssues={14}
                  formatSuggestionLabel={(s) =>
                    formatGaSuggestionShortLabel(s, {
                      roomCode: roomById.get(s.roomId)?.code ?? s.roomId,
                      instructorDisplay: formatUserInstructorLabel(
                        userById.get(s.instructorId),
                        facultyProfileByUserId.get(s.instructorId),
                      ),
                    })
                  }
                />
              </div>
            ) : campusConflictScan &&
              campusConflictScan.conflictingEntryIds.length === 0 &&
              campusConflictScan.entryCount > 0 ? (
              <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4">
                No resource overlaps detected for this scope and term.
              </p>
            ) : null}

            {loadError ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">{loadError}</div>
            ) : loading ? (
              <div className="text-sm text-black/60 py-8">Loading schedule…</div>
            ) : (
              <>
                <p className="text-[12px] text-black/60 mb-2">
                  After <strong>Run conflict check</strong>, overlapping rows are highlighted; click a row to edit time,
                  room, or instructor, or apply a suggested fix above.
                </p>
                <EvaluatorScheduleOverviewTable
                  rows={tableRows}
                  showCollegeColumn={isCampusWide}
                  highlightRowIds={campusConflictHighlightIds}
                  focusRowId={focusEntryId}
                  conflictDetailsByRowId={conflictDetailsByRowId}
                  rowDomIdPrefix="central-eval-row"
                  onRowClick={(id) => setEditEntryId(id)}
                />
              </>
            )}

            <DoiScheduleEntryQuickEditDialog
              open={Boolean(editEntryId)}
              onOpenChange={(o) => {
                if (!o) setEditEntryId(null);
              }}
              entry={editEntry}
              rooms={roomsForEdit}
              instructors={instructorsForEdit}
              facultyProfileByUserId={facultyProfileByUserId}
              busy={editBusy}
              onSave={async (patch) => {
                if (!editEntryId) return;
                const savedId = editEntryId;
                setEditBusy(true);
                try {
                  const supabase = createSupabaseBrowserClient();
                  if (!supabase) throw new Error("Supabase not configured");
                  const { error } = await supabase.from("ScheduleEntry").update(patch).eq("id", savedId);
                  if (error) throw new Error(error.message);
                  setEditEntryId(null);
                  setCampusConflictScan(null);
                  setHubConflictGaByIssueKey({});
                  setFocusEntryId(null);
                  await load();
                  dispatchInsCatalogReload();
                  const anchor = entries.find((x) => x.id === savedId);
                  const sec = anchor ? sectionById.get(anchor.sectionId) : undefined;
                  const pr = sec ? programById.get(sec.programId) : null;
                  const sub = anchor ? subjectById.get(anchor.subjectId) : undefined;
                  void fetch("/api/audit/schedule-write", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "hub.schedule_dialog_edit",
                      collegeId: pr?.collegeId ?? scopeCollegeId,
                      academicPeriodId: anchor?.academicPeriodId ?? academicPeriodId,
                      details: {
                        entryId: savedId,
                        subjectCode: sub?.code ?? "",
                        sectionName: sec?.name ?? "",
                        patch,
                      },
                    }),
                  });
                } finally {
                  setEditBusy(false);
                }
              }}
            />

            {altOpen ? (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
                <div
                  className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-black/10"
                  role="dialog"
                  aria-modal="true"
                >
                  <h2 className="text-lg font-semibold mb-2">Alternative suggestions</h2>
                  <p className="text-sm text-black/65 mb-4">
                    Rule-based optimization for the first scheduled row in this college (same engine as the Chairman
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
          </>
        ) : panel === "hrs" ? (
          <HrsUnitsPrepsRemarksTable />
        ) : null}
      </div>
    </div>
  );
}
