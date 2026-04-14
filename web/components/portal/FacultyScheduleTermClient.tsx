"use client";

import { useEffect, useMemo, useState } from "react";
import { OpticoreInsForm5A } from "@/components/ins/ins-layout/OpticoreInsDocuments";
import type { InsFacultyFormSummary } from "@/lib/ins/build-ins-faculty-view";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import type { ScheduleRowView } from "@/lib/server/dashboard-data";
import { buildPortalFacultyIns5A } from "@/lib/portal/build-portal-ins-forms";
import { FacultyScheduleChangeModal } from "@/components/faculty/FacultyScheduleChangeModal";
import { Button } from "@/components/ui/button";

type FacultyPayload = {
  rows: ScheduleRowView[];
};

/**
 * INS 5A + schedule grid for the instructor — respects the shell semester filter.
 * Includes “Request schedule change” (toolbar + clickable plotted cells → modal).
 */
export function FacultyScheduleTermClient({
  facultyName,
  facultyUserId,
}: {
  facultyName: string;
  facultyUserId: string;
}) {
  const { selectedPeriodId, selectedPeriod, ready } = useSemesterFilter();
  const [rows, setRows] = useState<ScheduleRowView[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [initialEntryId, setInitialEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !selectedPeriodId) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/portal/faculty-term-data?periodId=${encodeURIComponent(selectedPeriodId)}`,
        );
        const j = (await res.json()) as FacultyPayload & { error?: string };
        if (!res.ok) {
          if (!cancelled) setErr(j.error ?? "Could not load schedule.");
          return;
        }
        if (!cancelled) setRows(j.rows ?? []);
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

  const built = useMemo(() => {
    const pid = selectedPeriodId ?? "";
    return buildPortalFacultyIns5A(rows, pid, facultyUserId);
  }, [rows, selectedPeriodId, facultyUserId]);

  const facultyFormSummary: InsFacultyFormSummary = {
    ...built.teachingMetrics,
    administrativeDesignation: null,
    production: null,
    extension: null,
    research: null,
  };

  const semesterLabel = selectedPeriod?.name ?? "—";

  function openChangeModal(entryId: string | null) {
    setInitialEntryId(entryId);
    setChangeOpen(true);
  }

  if (!ready || !selectedPeriodId) {
    return <p className="text-sm text-black/55 p-6">Loading academic term…</p>;
  }

  if (err) {
    return <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4 m-6">{err}</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-10 max-w-[1200px] mx-auto space-y-4">
      <FacultyScheduleChangeModal
        open={changeOpen}
        onOpenChange={setChangeOpen}
        academicPeriodId={selectedPeriodId}
        initialScheduleEntryId={initialEntryId}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-black/60 max-w-2xl">
          Tap a plotted class in the grid to request a new day/time, or use the button to pick from a list.
        </p>
        <Button
          type="button"
          className="shrink-0 bg-[#780301] hover:bg-[#5c0201] text-white font-semibold"
          onClick={() => openChangeModal(null)}
        >
          Request schedule change
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-950 px-4 py-3 text-sm">
          No schedule entries are assigned to you for this term. Contact your chair or college admin if this is
          unexpected.
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
        <OpticoreInsForm5A
          facultyName={facultyName}
          schedule={built.schedule}
          courses={built.courses}
          readOnly
          semesterLabel={semesterLabel}
          facultyFormSummary={facultyFormSummary}
          clickableScheduleEntryCells
          onScheduleEntryClick={(id) => openChangeModal(id)}
        />
        {loading ? <p className="text-xs text-black/40 mt-2">Refreshing schedule…</p> : null}
      </div>
    </div>
  );
}
