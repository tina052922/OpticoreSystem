"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { OpticoreInsForm5B } from "@/components/ins/ins-layout/OpticoreInsDocuments";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import type { ScheduleRowView } from "@/lib/server/dashboard-data";
import type { Program, Section } from "@/types/db";
import { buildPortalStudentIns5B } from "@/lib/portal/build-portal-ins-forms";

type StudentPayload = {
  rows: ScheduleRowView[];
  section: Section | null;
  program: Program | null;
};

/** INS 5B for the student’s section, filtered by the global semester selection. */
export function StudentScheduleTermClient() {
  const { selectedPeriodId, selectedPeriod, ready } = useSemesterFilter();
  const [data, setData] = useState<StudentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !selectedPeriodId) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/portal/student-term-data?periodId=${encodeURIComponent(selectedPeriodId)}`,
        );
        const j = (await res.json()) as StudentPayload & { error?: string };
        if (!res.ok) {
          if (!cancelled) setErr(j.error ?? "Could not load schedule.");
          return;
        }
        if (!cancelled) setData(j);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not load schedule.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, selectedPeriodId]);

  const rows = data?.rows ?? [];
  const section = data?.section;
  const program = data?.program;

  const { schedule, courses } = useMemo(() => buildPortalStudentIns5B(rows), [rows]);

  const degreeAndYear =
    program && section
      ? `${program.name} · Year level ${section.yearLevel}`
      : program?.name ?? "—";
  const assignment = section?.name ?? "—";
  const semesterLabel = selectedPeriod?.name ?? "—";

  if (!ready || !selectedPeriodId) {
    return <p className="text-sm text-black/55 p-6">Loading academic term…</p>;
  }

  if (err) {
    return <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4 m-6">{err}</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-4">
      <Link
        href="/student"
        className="inline-flex items-center gap-2 text-sm font-medium text-black/70 hover:text-black"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-800">My schedule</h1>
        <p className="text-gray-600 text-sm mt-1">
          INS Form 5B — Program by Section (your section only). Matches the official grid format used in Campus
          Intelligence.
          {loading ? <span className="ml-2 text-black/40">Updating…</span> : null}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-950 px-4 py-3 text-sm">
          No schedule entries are published for your section this term. Contact your program office if this is
          unexpected.
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
        <OpticoreInsForm5B
          degreeAndYear={degreeAndYear}
          adviser="—"
          assignment={assignment}
          schedule={schedule}
          courses={courses}
          readOnly
          semesterLabel={semesterLabel}
        />
      </div>
    </div>
  );
}
