"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { NotifyGecReadyButton } from "@/components/college/NotifyGecReadyButton";
import { TeachingLoadSummaryTable } from "@/components/college/TeachingLoadSummaryTable";
import { TeachingLoadSummaryDocument } from "@/components/pdf/forms/TeachingLoadSummaryDocument";
import { PDFPreviewModal } from "@/components/pdf/preview/PDFPreviewModal";
import { Button } from "@/components/ui/button";
import { apiFetch, authApi, catalogApi, ApiClientError } from "@/lib/api/client";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import { hydrateScheduleEntries } from "@/lib/scheduling/program-mode";
import { buildTeachingLoadSummaryByCategory } from "@/lib/scheduling/teaching-load-summary";
import type { FacultyProfile, Program, ScheduleEntry, ScheduleLoadJustification, Section, Subject, User } from "@/types/db";

export function CollegeTeachingLoadSummaryClient() {
  const { selectedPeriodId, selectedPeriod } = useSemesterFilter();
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [collegeName, setCollegeName] = useState("College");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<FacultyProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [justifications, setJustifications] = useState<ScheduleLoadJustification[]>([]);
  const [pdfOpen, setPdfOpen] = useState(false);

  const load = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
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
      const [bundle, profileRes, collegesRes] = await Promise.all([
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
        catalogApi.colleges().catch(() => ({ colleges: [] as { id: string; name?: string; code?: string }[] })),
      ]);
      setEntries(hydrateScheduleEntries(bundle.entries ?? []));
      setUsers(bundle.users ?? []);
      setPrograms(bundle.programs ?? []);
      setSections(bundle.sections ?? []);
      setSubjects(bundle.subjects ?? []);
      setJustifications(bundle.justifications ?? []);
      setProfiles(profileRes.profiles ?? bundle.facultyProfiles ?? []);
      const college = (collegesRes.colleges as { id: string; name?: string; code?: string }[]).find((c) => c.id === cid);
      setCollegeName(college?.name?.trim() || college?.code?.trim() || "College");
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to load teaching load.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    void load("initial");
  }, [load]);

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

  const semesterLabel = selectedPeriod
    ? `${selectedPeriod.name}${selectedPeriod.academicYear ? ` · ${selectedPeriod.academicYear}` : ""}`
    : "Selected term";
  const pdfFilename = `Summary-of-Teaching-Load-${collegeName.replace(/\s+/g, "-")}.pdf`;

  return (
    <div>
      <ChairmanPageHeader title="Summary of Teaching Load" />
      <div className="px-4 md:px-8 pb-10 max-w-[1400px] mx-auto space-y-4">
        <p className="text-[13px] text-black/65">
          Instructors grouped by department under this college. Day and Evening loads are independent. Justification
          appears when a plot exceeded the prep or hour policy.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" disabled={loading || refreshing} onClick={() => void load("refresh")}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button type="button" disabled={loading || groups.length === 0} onClick={() => setPdfOpen(true)}>
            Preview / Download PDF
          </Button>
          <NotifyGecReadyButton
            academicPeriodId={selectedPeriodId}
            periodLabel={semesterLabel}
            programs={collegeId ? programs.filter((p) => p.collegeId === collegeId) : []}
          />
        </div>
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
          <div className="space-y-6">
            {groups.length === 0 ? (
              <TeachingLoadSummaryTable rows={[]} emptyHint="No departments found for this college." />
            ) : (
              groups.map((g) => (
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
          <TeachingLoadSummaryDocument collegeName={collegeName} semesterLabel={semesterLabel} groups={groups} />
        }
      />
    </div>
  );
}
