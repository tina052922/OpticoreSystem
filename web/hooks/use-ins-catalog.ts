"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { normalizeProspectusCode } from "@/lib/chairman/bsit-prospectus";
import { scanAllScheduleConflicts } from "@/lib/scheduling/conflicts";
import type { ScheduleBlock } from "@/lib/scheduling/types";
import type { AcademicPeriod, Program, Room, ScheduleEntry, Section, Subject, User } from "@/types/db";

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
export function useInsCatalog(args: { collegeId: string | null; programId: string | null; campusWide?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [academicPeriodId, setAcademicPeriodId] = useState("");

  const load = useCallback(async () => {
    if (!args.collegeId && !args.campusWide) {
      setLoading(false);
      setEntries([]);
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
    const [
      { data: ap, error: e1 },
      { data: sch, error: e2 },
      { data: sec, error: e3 },
      { data: sub, error: e4 },
      { data: rm, error: e5 },
      { data: prog, error: e6 },
      { data: fac, error: e7 },
    ] = await Promise.all([
      supabase.from("AcademicPeriod").select("*").order("startDate", { ascending: false }),
      supabase.from("ScheduleEntry").select("*"),
      supabase.from("Section").select("*").order("name"),
      supabase.from("Subject").select("*").order("code"),
      supabase.from("Room").select("*").order("code"),
      supabase.from("Program").select("*").order("name"),
      supabase.from("User").select("id,email,name,role,collegeId"),
    ]);
    const err = e1 || e2 || e3 || e4 || e5 || e6 || e7;
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setPeriods((ap ?? []) as AcademicPeriod[]);
    setEntries((sch ?? []) as ScheduleEntry[]);
    setSections((sec ?? []) as Section[]);
    setSubjects((sub ?? []) as Subject[]);
    setRooms((rm ?? []) as Room[]);
    setPrograms((prog ?? []) as Program[]);
    setUsers((fac ?? []) as User[]);
    setLoading(false);
  }, [args.collegeId, args.campusWide]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!args.collegeId && !args.campusWide) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const ch = supabase
      .channel("ins-schedule-entry")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ScheduleEntry" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [load, args.collegeId, args.campusWide]);

  useEffect(() => {
    if (periods.length === 0 || academicPeriodId) return;
    const cur = periods.find((x) => x.isCurrent) ?? periods[0];
    if (cur) setAcademicPeriodId(cur.id);
  }, [periods, academicPeriodId]);

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

  const scopedEntries = useMemo(() => {
    if (args.campusWide) {
      return entries.filter((e) => sectionById.has(e.sectionId));
    }
    if (!args.collegeId) return entries;
    return entries.filter((e) => {
      const sec = sectionById.get(e.sectionId);
      if (!sec) return false;
      const pr = programById.get(sec.programId);
      if (!pr) return false;
      if (pr.collegeId !== args.collegeId) return false;
      if (args.programId && sec.programId !== args.programId) return false;
      return true;
    });
  }, [entries, args.collegeId, args.programId, args.campusWide, sectionById, programById]);

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
      if (u) list.push({ id: u.id, name: u.name });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [termEntries, users]);

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

  const getInsConflictSummaries = useCallback(() => {
    const blocks = scopedEntries
      .filter((e) => e.academicPeriodId === academicPeriodId)
      .map(toScheduleBlock);
    return scanAllScheduleConflicts(blocks).issueSummaries;
  }, [scopedEntries, academicPeriodId]);

  /** True when VPAA has published this term: at least one scoped row carries lockedByDoiAt. */
  const termPublishLocked = useMemo(() => {
    return scopedEntries
      .filter((e) => e.academicPeriodId === academicPeriodId)
      .some((e) => Boolean(e.lockedByDoiAt));
  }, [scopedEntries, academicPeriodId]);

  return {
    loading,
    error,
    periodLabel,
    periods,
    academicPeriodId,
    setAcademicPeriodId,
    scopedEntries,
    subjectIdByCode,
    termPublishLocked,
    sectionById,
    subjectById,
    roomById,
    userById,
    instructorOptions,
    sectionOptions,
    roomOptions,
    getInsConflictSummaries,
    reload: load,
  };
}
