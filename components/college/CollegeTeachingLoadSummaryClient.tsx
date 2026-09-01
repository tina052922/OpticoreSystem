"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { TeachingLoadSummaryTable } from "@/components/college/TeachingLoadSummaryTable";
import { apiFetch, authApi, ApiClientError } from "@/lib/api/client";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import { hydrateScheduleEntries } from "@/lib/scheduling/program-mode";
import { buildTeachingLoadSummary } from "@/lib/scheduling/teaching-load-summary";
import { useScheduleEntryCrossReload } from "@/hooks/use-schedule-entry-cross-reload";
import type { FacultyProfile, Program, ScheduleEntry, ScheduleLoadJustification, Section, Subject, User } from "@/types/db";

export function CollegeTeachingLoadSummaryClient() {
  const { selectedPeriodId } = useSemesterFilter();
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<FacultyProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [justifications, setJustifications] = useState<ScheduleLoadJustification[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { user } = await authApi.me();
      const cid = user?.collegeId?.trim() || null;
      setCollegeId(cid);
      if (!cid || !selectedPeriodId) {
        setEntries([]);
        setUsers([]);
        setProfiles([]);
        setPrograms([]);
        setSections([]);
        setSubjects([]);
        setJustifications([]);
        return;
      }
      const [bundle, profileRes] = await Promise.all([
        apiFetch<{
          entries?: ScheduleEntry[];
          users?: User[];
          programs?: Program[];
          sections?: Section[];
          subjects?: Subject[];
          justifications?: ScheduleLoadJustification[];
          facultyProfiles?: FacultyProfile[];
        }>(`/api/catalog/evaluator-bundle?academicPeriodId=${encodeURIComponent(selectedPeriodId)}`, {
          method: "GET",
        }),
        apiFetch<{ profiles: FacultyProfile[] }>("/api/catalog/faculty-profiles", { method: "GET" }),
      ]);
      setEntries(hydrateScheduleEntries(bundle.entries ?? []));
      setUsers(bundle.users ?? []);
      setPrograms(bundle.programs ?? []);
      setSections(bundle.sections ?? []);
      setSubjects(bundle.subjects ?? []);
      setJustifications(bundle.justifications ?? []);
      setProfiles(profileRes.profiles ?? bundle.facultyProfiles ?? []);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to load teaching load.");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    void load();
  }, [load]);

  useScheduleEntryCrossReload(() => {
    void load();
  }, { academicPeriodId: selectedPeriodId });

  const rows = useMemo(() => {
    if (!collegeId || !selectedPeriodId) return [];
    return buildTeachingLoadSummary({
      collegeId,
      academicPeriodId: selectedPeriodId,
      entries,
      users,
      profiles,
      programs,
      sections,
      subjects,
      justifications,
    });
  }, [collegeId, selectedPeriodId, entries, users, profiles, programs, sections, subjects, justifications]);

  return (
    <div>
      <ChairmanPageHeader title="Summary of Teaching Load" />
      <div className="px-4 md:px-8 pb-10 max-w-[1400px] mx-auto space-y-4">
        <p className="text-[13px] text-black/65">
          Instructors under departments of this college. Day and Evening loads are independent. Justification appears
          when a plot exceeded the prep or hour policy.
        </p>
        {error ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        ) : null}
        {loading ? (
          <p className="text-sm text-black/55">Loading summary…</p>
        ) : !collegeId ? (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Your account is not linked to a college, so this summary cannot be scoped.
          </p>
        ) : !selectedPeriodId ? (
          <p className="text-sm text-black/55">Select an academic term in the sidebar.</p>
        ) : (
          <TeachingLoadSummaryTable rows={rows} />
        )}
      </div>
    </div>
  );
}
