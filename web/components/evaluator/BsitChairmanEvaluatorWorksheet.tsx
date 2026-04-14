"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Q } from "@/lib/supabase/catalog-columns";
import { detectConflictsSparse } from "@/lib/scheduling/conflicts";
import type { SparseScheduleBlock } from "@/lib/scheduling/conflicts";
import { evaluateFacultyLoadsForCollege } from "@/lib/scheduling/facultyPolicies";
import type { ScheduleBlock } from "@/lib/scheduling/types";
import type { FacultyProfile, Room, ScheduleEntry, ScheduleLoadJustification, Section, Subject, User } from "@/types/db";
import { Button } from "@/components/ui/button";
import {
  BSIT_PROSPECTUS_SUBJECTS,
  BSIT_SCHEDULING_ROOM_CODES,
  BSIT_SECTION_NAMES,
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
import { writeEvaluatorSessionSnapshot } from "@/lib/opticore-evaluator-session-sync";
import type { ChairmanPolicySnapshot } from "@/components/evaluator/ChairmanEvaluatorLoadPanel";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";

const MAJOR_FIXED = "BSIT";

const selectClass =
  "w-full min-h-10 rounded-md border border-black/25 bg-white px-2 text-[11px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ff990a]/40";

/** Fallback when Supabase has no instructors (demo). */
const SAMPLE_INSTRUCTORS: { id: string; name: string }[] = [
  { id: "sample-ins-1", name: "Prof. Ramon Santos" },
  { id: "sample-ins-2", name: "Dr. Ana L. Reyes" },
  { id: "sample-ins-3", name: "Engr. Marco Dela Cruz" },
  { id: "sample-ins-4", name: "Ms. Clara V. Gomez" },
];

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
  /** Live load summary for the Evaluator &quot;Hrs-Units-Preps-Remarks&quot; tab. */
  onPolicySnapshot?: (snapshot: ChairmanPolicySnapshot | null) => void;
};

export function BsitChairmanEvaluatorWorksheet({
  chairmanCollegeId,
  chairmanProgramId,
  onPolicySnapshot,
}: BsitChairmanEvaluatorWorksheetProps) {
  const { selectedPeriodId: academicPeriodId, selectedPeriod } = useSemesterFilter();
  const [sections, setSections] = useState<Section[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [dbInstructors, setDbInstructors] = useState<User[]>([]);
  const [facultyProfiles, setFacultyProfiles] = useState<FacultyProfile[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rows, setRows] = useState<PlotRow[]>([]);
  const [justificationText, setJustificationText] = useState("");
  const [justificationSaving, setJustificationSaving] = useState(false);
  const [justificationMsg, setJustificationMsg] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const lastSyncedRowIdsRef = useRef<Set<string>>(new Set());
  /** IDs loaded with `lockedByDoiAt` — never send DELETE for these if they disappear from state (e.g. scope change). */
  const lockedEntryIdsRef = useRef<Set<string>>(new Set());
  const didHydrateFromDbRef = useRef(false);

  const programId = chairmanProgramId ?? "prog-bsit";

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

  const bsitSections = useMemo(() => {
    const names = new Set(BSIT_SECTION_NAMES.map((n) => n.replace(/\s+/g, "-").toUpperCase()));
    return sections.filter((s) => {
      if (chairmanProgramId && s.programId !== chairmanProgramId) return false;
      const n = s.name.trim().replace(/\s+/g, "-").replace(/-+/g, "-").toUpperCase();
      return names.has(n);
    });
  }, [sections, chairmanProgramId]);

  const subjectIdByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of subjects) {
      if (chairmanProgramId && s.programId !== chairmanProgramId) continue;
      m.set(normalizeProspectusCode(s.code), s.id);
    }
    return m;
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

  const instructorOptions = useMemo(() => {
    if (dbInstructors.length > 0) return dbInstructors.map((u) => ({ id: u.id, name: u.name }));
    return SAMPLE_INSTRUCTORS;
  }, [dbInstructors]);

  const instructorNameById = useMemo(() => {
    const m = new Map<string, string>();
    instructorOptions.forEach((u) => m.set(u.id, u.name));
    return m;
  }, [instructorOptions]);

  const userById = useMemo(() => {
    const m = new Map<string, User>();
    dbInstructors.forEach((u) => m.set(u.id, u));
    if (dbInstructors.length === 0) {
      const now = new Date().toISOString();
      for (const s of SAMPLE_INSTRUCTORS) {
        m.set(s.id, {
          id: s.id,
          employeeId: null,
          email: `${s.id}@sample.local`,
          name: s.name,
          role: "instructor",
          collegeId: chairmanCollegeId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    return m;
  }, [dbInstructors, chairmanCollegeId]);

  const sectionNameById = useMemo(() => {
    const m = new Map<string, string>();
    bsitSections.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [bsitSections]);

  /** Align plotted subjects with the global term: prospectus semester 1 vs 2 from `AcademicPeriod` naming. */
  const termProspectusSemester = useMemo(
    () => prospectusSemesterFromAcademicPeriod(selectedPeriod),
    [selectedPeriod],
  );

  /** Any row published for this term — RLS blocks chairman mutations; worksheet stays read-only. */
  const schedulePublished = useMemo(() => rows.some((r) => Boolean(r.lockedByDoiAt)), [rows]);

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

  const sparseUniverse = useMemo((): SparseScheduleBlock[] => {
    if (!academicPeriodId) return [];
    const list: SparseScheduleBlock[] = [];
    for (const row of rows) {
      const b = rowToSparseBlock(row, academicPeriodId);
      if (b) list.push(b);
    }
    return list;
  }, [rows, academicPeriodId]);

  const conflictForRow = useCallback(
    (row: PlotRow): { faculty: string; room: string; section: string } => {
      if (!academicPeriodId) return { faculty: "—", room: "—", section: "—" };
      const candidate = rowToSparseBlock(row, academicPeriodId);
      if (!candidate) return { faculty: "—", room: "—", section: "—" };
      const hits = detectConflictsSparse(candidate, sparseUniverse, candidate.id);
      const fac = hits.some((h) => h.type === "faculty");
      const room = hits.some((h) => h.type === "room");
      const sec = hits.some((h) => h.type === "section");
      return {
        faculty: !candidate.instructorId ? "—" : fac ? "Yes" : "No",
        room: !candidate.roomId ? "—" : room ? "Yes" : "No",
        section: !candidate.sectionId ? "—" : sec ? "Yes" : "No",
      };
    },
    [academicPeriodId, sparseUniverse],
  );

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
      return;
    }
    const t = justificationText.trim();
    if (t.length < 12) {
      setJustificationMsg("Enter at least 12 characters for VPAA review.");
      return;
    }
    if (!policyRows.hasAnyViolation) {
      setJustificationMsg("No load-policy violations detected; a justification is not required.");
      return;
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
        return;
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
        return;
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
    setRows((prev) => {
      if (prev.some((r) => Boolean(r.lockedByDoiAt))) return prev;
      return [...prev, emptyRow()];
    });
  }

  function removeRow(id: string) {
    setRows((prev) => {
      if (prev.some((r) => r.id === id && r.lockedByDoiAt)) return prev;
      return prev.filter((r) => r.id !== id);
    });
  }

  const loadRowsFromSupabase = useCallback(async () => {
    if (!academicPeriodId) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setLoadError(null);

    const sectionIds = new Set(bsitSections.map((s) => s.id));
    if (sectionIds.size === 0) return;

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
    const relevant = entries.filter((e) => sectionIds.has(e.sectionId));

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
    setRows(nextRows);

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
  }, [academicPeriodId, bsitSections, subjectCodeById, chairmanCollegeId]);

  useEffect(() => {
    void loadRowsFromSupabase();
  }, [loadRowsFromSupabase]);

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
    if (!academicPeriodId) return;
    if (!didHydrateFromDbRef.current) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const t = setTimeout(() => {
      void (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const upserts: ScheduleEntry[] = [];
        for (const row of rows) {
          if (row.lockedByDoiAt) continue;
          if (!row.sectionId || !row.instructorId || !row.roomId || !row.subjectCode) continue;
          const subjectId = subjectIdByCode.get(normalizeProspectusCode(row.subjectCode));
          if (!subjectId) continue;
          const tb = rowTimeBounds(row);
          if (!tb) continue;
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

        if (removedIds.length > 0) {
          const { error: delErr } = await supabase.from("ScheduleEntry").delete().in("id", removedIds);
          if (delErr) {
            setLoadError(delErr.message);
            return;
          }
        }

        if (upserts.length > 0) {
          const { error: upErr } = await supabase.from("ScheduleEntry").upsert(upserts, { onConflict: "id" });
          if (upErr) {
            setLoadError(upErr.message);
            return;
          }
        }

        const wrote = upserts.length > 0 || removedIds.length > 0;
        if (wrote) {
          /** Central Hub + INS forms read the same `ScheduleEntry` rows — refresh catalog views without inbox forwarding. */
          dispatchInsCatalogReload();
          void fetch("/api/audit/schedule-write", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "chairman.evaluator_autosave",
              collegeId: chairmanCollegeId,
              academicPeriodId,
              details: { upsertCount: upserts.length, deleteCount: removedIds.length },
            }),
          });
        }

        lastSyncedRowIdsRef.current = new Set(rows.map((r) => r.id));
      })();
    }, 600);

    return () => clearTimeout(t);
  }, [rows, academicPeriodId, subjectIdByCode, chairmanCollegeId]);

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

      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <Button
          type="button"
          className="bg-[#ff990a] hover:bg-[#e68a09] text-white font-bold disabled:opacity-50 disabled:pointer-events-none"
          disabled={schedulePublished}
          onClick={addRow}
        >
          + Add schedule row
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-[0px_4px_4px_rgba(0,0,0,0.12)] overflow-hidden border border-black/10">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1100px]">
            <thead>
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-[13px] text-black/50">
                    No rows yet. Click &quot;Add schedule row&quot; to plot BSIT sections (Mon–Fri, 7:00 AM–5:00 PM).
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => {
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
                  return (
                    <tr key={row.id} className={`text-[11px] ${i % 2 === 0 ? "bg-white" : "bg-black/[0.02]"}`}>
                      <td className="border border-black/10 px-2 py-1.5 font-semibold text-black/80">{MAJOR_FIXED}</td>
                      <td className="border border-black/10 px-1 py-1">
                        <select
                          className={selectClass}
                          value={row.sectionId}
                          disabled={rowReadOnly}
                          onChange={(e) => {
                            const sectionId = e.target.value;
                            const name = bsitSections.find((s) => s.id === sectionId)?.name ?? "";
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
                          {bsitSections.map((s) => (
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
                          {subjectOptions.map((s) => (
                            <option key={s.code} value={s.code}>
                              {s.code} — {s.title}
                            </option>
                          ))}
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
                        >
                          <option value="">Select…</option>
                          {instructorOptions.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
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

      <BsitWeekPreview
        rows={rows}
        sectionNameById={sectionNameById}
        roomCodeById={roomCodeById}
        instructorNameById={instructorNameById}
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
    </div>
  );
}

function BsitWeekPreview({
  rows,
  sectionNameById,
  roomCodeById,
  instructorNameById,
  selectedSectionId,
}: {
  rows: PlotRow[];
  sectionNameById: Map<string, string>;
  roomCodeById: Map<string, string>;
  instructorNameById: Map<string, string>;
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
                          const inst = instructorNameById.get(r.instructorId) ?? "";
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
