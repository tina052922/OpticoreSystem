"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { TeachingLoadSummaryTable } from "@/components/college/TeachingLoadSummaryTable";
import { TeachingLoadSummaryDocument } from "@/components/pdf/forms/TeachingLoadSummaryDocument";
import { PDFPreviewModal } from "@/components/pdf/preview/PDFPreviewModal";
import { Button } from "@/components/ui/button";
import { apiFetch, authApi, catalogApi, ApiClientError } from "@/lib/api/client";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import { hydrateScheduleEntries } from "@/lib/scheduling/program-mode";
import { buildTeachingLoadSummaryByCategory } from "@/lib/scheduling/teaching-load-summary";
import type { FacultyProfile, Program, ScheduleEntry, ScheduleLoadJustification, Section, Subject, User } from "@/types/db";

const ALL_CATEGORIES = "";

type BundlePayload = {
  collegeId: string;
  collegeName: string;
  entries: ScheduleEntry[];
  users: User[];
  profiles: FacultyProfile[];
  programs: Program[];
  sections: Section[];
  subjects: Subject[];
  justifications: ScheduleLoadJustification[];
};

export function CollegeTeachingLoadSummaryClient() {
  const { selectedPeriodId, selectedPeriod } = useSemesterFilter();
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [collegeName, setCollegeName] = useState("College");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<FacultyProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [justifications, setJustifications] = useState<ScheduleLoadJustification[]>([]);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES);
  const cacheRef = useRef<Map<string, BundlePayload>>(new Map());
  const loadedKeyRef = useRef<string | null>(null);

  const applyPayload = useCallback((payload: BundlePayload) => {
    setCollegeId(payload.collegeId);
    setCollegeName(payload.collegeName);
    setEntries(payload.entries);
    setUsers(payload.users);
    setProfiles(payload.profiles);
    setPrograms(payload.programs);
    setSections(payload.sections);
    setSubjects(payload.subjects);
    setJustifications(payload.justifications);
  }, []);

  const load = useCallback(async (periodId: string | null) => {
    const key = periodId ?? "";
    const cached = cacheRef.current.get(key);
    if (cached) {
      applyPayload(cached);
      setLoading(false);
      setError(null);
      loadedKeyRef.current = key;
      return;
    }

    const hadRows = loadedKeyRef.current !== null;
    if (!hadRows) setLoading(true);
    setError(null);
    try {
      const { user } = await authApi.me();
      const cid = user?.collegeId?.trim() || null;
      if (!cid || !periodId) {
        const empty: BundlePayload = {
          collegeId: cid ?? "",
          collegeName: "College",
          entries: [],
          users: [],
          profiles: [],
          programs: [],
          sections: [],
          subjects: [],
          justifications: [],
        };
        if (cid) setCollegeId(cid);
        applyPayload(empty);
        cacheRef.current.set(key, empty);
        loadedKeyRef.current = key;
        return;
      }
      const [bundle, profileRes, collegesRes] = await Promise.all([
        apiFetch<{
          entries?: ScheduleEntry[];
          users?: User[];
          programs?: Program[];
          sections?: Section[];
          subjects?: Subject[];
          justifications?: ScheduleLoadJustification[];
          facultyProfiles?: FacultyProfile[];
        }>(`/api/catalog/evaluator-bundle?academicPeriodId=${encodeURIComponent(periodId)}`, {
          method: "GET",
        }),
        apiFetch<{ profiles: FacultyProfile[] }>("/api/catalog/faculty-profiles", { method: "GET" }),
        catalogApi.colleges().catch(() => ({ colleges: [] as { id: string; name?: string; code?: string }[] })),
      ]);
      const college = (collegesRes.colleges as { id: string; name?: string; code?: string }[]).find((c) => c.id === cid);
      const payload: BundlePayload = {
        collegeId: cid,
        collegeName: college?.name?.trim() || college?.code?.trim() || "College",
        entries: hydrateScheduleEntries(bundle.entries ?? []),
        users: bundle.users ?? [],
        programs: bundle.programs ?? [],
        sections: bundle.sections ?? [],
        subjects: bundle.subjects ?? [],
        justifications: bundle.justifications ?? [],
        profiles: profileRes.profiles ?? bundle.facultyProfiles ?? [],
      };
      cacheRef.current.set(key, payload);
      applyPayload(payload);
      loadedKeyRef.current = key;
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to load teaching load.");
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    void load(selectedPeriodId);
  }, [load, selectedPeriodId]);

  const groups = useMemo(() => {
    if (!collegeId || !selectedPeriodId) return [];
    return buildTeachingLoadSummaryByCategory({
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

  const visibleGroups = useMemo(() => {
    if (!categoryId) return groups;
    return groups.filter((g) => g.programId === categoryId);
  }, [groups, categoryId]);

  const semesterLabel = selectedPeriod
    ? `${selectedPeriod.name}${selectedPeriod.academicYear ? ` · ${selectedPeriod.academicYear}` : ""}`
    : "Selected term";
  const pdfFilename = `Summary-of-Teaching-Load-${collegeName.replace(/\s+/g, "-")}.pdf`;
  const showInitialLoading = loading && loadedKeyRef.current === null && !error;

  return (
    <div>
      <ChairmanPageHeader title="Summary of Teaching Load" />
      <div className="px-4 md:px-8 pb-10 max-w-[1400px] mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-black/65">
            Instructors grouped by department. Day and Evening loads stay separate. Numbers come from plotted schedules.
          </p>
          <Button type="button" disabled={showInitialLoading || groups.length === 0} onClick={() => setPdfOpen(true)}>
            Download PDF
          </Button>
        </div>
        {groups.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryId(ALL_CATEGORIES)}
              className={`h-8 px-3 rounded-md text-[12px] font-semibold border ${
                categoryId === ALL_CATEGORIES
                  ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                  : "bg-white text-black/80 border-black/15"
              }`}
            >
              All departments
            </button>
            {groups.map((g) => (
              <button
                key={g.programId}
                type="button"
                onClick={() => setCategoryId(g.programId)}
                className={`h-8 px-3 rounded-md text-[12px] font-semibold border ${
                  categoryId === g.programId
                    ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                    : "bg-white text-black/80 border-black/15"
                }`}
              >
                {g.categoryLabel}
              </button>
            ))}
          </div>
        ) : null}
        {error ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        ) : null}
        {showInitialLoading ? (
          <p className="text-sm text-black/55">Loading summary…</p>
        ) : !collegeId ? (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Your account is not linked to a college, so this summary cannot be scoped.
          </p>
        ) : !selectedPeriodId ? (
          <p className="text-sm text-black/55">Select an academic term in the sidebar.</p>
        ) : (
          <div className="space-y-6">
            {visibleGroups.length === 0 ? (
              <TeachingLoadSummaryTable rows={[]} emptyHint="No departments found for this college." />
            ) : (
              visibleGroups.map((g) => (
                <TeachingLoadSummaryTable
                  key={g.programId}
                  categoryLabel={g.categoryLabel}
                  rows={g.rows}
                  emptyHint={`No instructors with plotted load in ${g.categoryLabel} for the selected term.`}
                />
              ))
            )}
          </div>
        )}
      </div>
      <PDFPreviewModal
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        filename={pdfFilename}
        document={
          <TeachingLoadSummaryDocument
            collegeName={collegeName}
            semesterLabel={semesterLabel}
            groups={visibleGroups}
          />
        }
      />
    </div>
  );
}
