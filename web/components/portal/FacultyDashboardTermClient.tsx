"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Clock, MapPin, Megaphone, BookOpen, LayoutGrid, Layers } from "lucide-react";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import { cn } from "@/components/ui/utils";
import type { ScheduleRowView } from "@/lib/server/dashboard-data";

type FacultyPayload = {
  rows: ScheduleRowView[];
  sectionIds: string[];
  advisorySectionId?: string | null;
  advisorySectionName?: string | null;
  weeklyHours: number;
  weeklyMeetingRowCount?: number;
  assignedSectionCount?: number;
};

export type FacultyDashboardSurface = "campus-intelligence" | "my-schedule";

type Props = {
  profileName: string;
  /** Visual accent: maroon top stripe vs orange — same widgets, different entry context. */
  surface?: FacultyDashboardSurface;
};

/**
 * Campus Intelligence (`/faculty`) summary: hours, meeting count, **section names only** (no student roster).
 * Full INS Form 5A + cell clicks for change requests live on **My schedule** (`/faculty/schedule`).
 */
export function FacultyDashboardTermClient({ profileName, surface = "campus-intelligence" }: Props) {
  const { selectedPeriodId, selectedPeriod, ready } = useSemesterFilter();
  const [data, setData] = useState<FacultyPayload | null>(null);
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
          `/api/portal/faculty-term-data?periodId=${encodeURIComponent(selectedPeriodId)}`,
        );
        const j = (await res.json()) as FacultyPayload & { error?: string };
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
  const weeklyHours = data?.weeklyHours ?? 0;
  const advisoryName = data?.advisorySectionName?.trim() ?? "";
  const advisoryId = data?.advisorySectionId?.trim() ?? "";
  const assignedSectionCount = data?.assignedSectionCount ?? data?.sectionIds?.length ?? 0;

  const scheduleSectionNames = useMemo(
    () => [...new Set(rows.map((r) => r.section?.name).filter(Boolean))] as string[],
    [rows],
  );

  /** Sections to teach + advisory (labels only; no student identifiers). */
  const assignedSectionLabels = useMemo(() => {
    const names = new Set<string>(scheduleSectionNames);
    if (advisoryName) names.add(advisoryName);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [scheduleSectionNames, advisoryName]);

  const meetingRows = data?.weeklyMeetingRowCount ?? rows.length;

  const displayName = profileName.replace(/^Prof\.\s*/i, "").split(",")[0]?.trim() ?? profileName;
  const periodLabel = selectedPeriod?.name ?? "Academic period";

  if (!ready || !selectedPeriodId) {
    return <p className="text-sm text-black/55 px-4 sm:px-6">Loading academic term…</p>;
  }

  if (err) {
    return <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4 mx-4 sm:mx-6">{err}</div>;
  }

  return (
    <div
      className={cn(
        "p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 rounded-xl border border-black/8 bg-[#fafafa]/50",
        surface === "my-schedule"
          ? "border-t-[3px] border-t-[var(--color-opticore-orange)] shadow-[0_1px_0_rgba(0,0,0,0.04)]"
          : "border-t-[3px] border-t-[#780301] shadow-[0_1px_0_rgba(0,0,0,0.04)]",
      )}
    >
      <header className="flex flex-wrap items-start gap-3">
        {surface === "my-schedule" ? (
          <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-opticore-orange)]/15 text-[var(--color-opticore-orange)]">
            <LayoutGrid className="w-5 h-5" aria-hidden />
          </span>
        ) : (
          <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#780301]/10 text-[#780301]">
            <LayoutGrid className="w-5 h-5" aria-hidden />
          </span>
        )}
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold text-black tracking-tight">Welcome, {displayName}</h1>
          <p className="text-sm text-black/60">
            {periodLabel} · CTU Argao
            {loading ? <span className="ml-2 text-black/40">Updating…</span> : null}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-black/10 p-4 shadow-sm flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-[var(--color-opticore-orange)]/15 flex items-center justify-center text-[var(--color-opticore-orange)]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-black/50 uppercase tracking-wide">Weekly contact (est.)</p>
            <p className="text-xl font-bold text-black">{weeklyHours} hrs</p>
            <p className="text-[10px] text-black/45 mt-0.5 leading-snug">Sum of class meeting lengths from your rows.</p>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-black/10 p-4 shadow-sm flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-[var(--color-opticore-orange)]/15 flex items-center justify-center text-[var(--color-opticore-orange)]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-black/50 uppercase tracking-wide">Weekly class meetings</p>
            <p className="text-xl font-bold text-black">{meetingRows}</p>
            <p className="text-[10px] text-black/45 mt-0.5 leading-snug">One per plotted schedule row (matches INS).</p>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-black/10 p-4 shadow-sm flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-[var(--color-opticore-orange)]/15 flex items-center justify-center text-[var(--color-opticore-orange)]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-black/50 uppercase tracking-wide">Assigned sections</p>
            <p className="text-xl font-bold text-black">{assignedSectionCount}</p>
            <p className="text-[10px] text-black/45 mt-0.5 leading-snug">Teaching + advisory (distinct).</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="My teaching schedule & load">
          <p className="text-xs text-black/50 mb-1">
            <span className="font-medium text-black/60">Sections with classes:</span>{" "}
            {scheduleSectionNames.length ? scheduleSectionNames.join(", ") : "—"}
          </p>
          {advisoryId ? (
            <p className="text-xs text-black/60 mb-3">
              <span className="font-medium text-[#780301]">Advisory:</span> {advisoryName || "Section on file"}
              {rows.some((r) => r.section?.id === advisoryId) ? (
                <span className="text-black/45"> (also listed above)</span>
              ) : null}
            </p>
          ) : data ? (
            <p className="text-xs text-black/45 mb-3">No advisory section on your faculty profile for this account.</p>
          ) : null}
          {rows.length === 0 ? (
            <p className="text-sm text-black/55">No assignments for this term in the repository.</p>
          ) : (
            <ul className="divide-y divide-black/10 rounded-lg border border-black/10 max-h-[320px] overflow-y-auto">
              {rows.slice(0, 10).map((r) => (
                <li key={r.entry.id} className="flex flex-wrap gap-2 px-3 py-2.5 text-sm">
                  <span className="font-medium w-20">{r.entry.day}</span>
                  <span className="text-black/70 tabular-nums w-28">
                    {r.entry.startTime}–{r.entry.endTime}
                  </span>
                  <span className="flex-1 min-w-[140px] font-medium text-black"> {r.subject?.code}</span>
                  <span className="text-black/60">{r.section?.name}</span>
                  <span className="text-black/55 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {r.room?.code}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/faculty/schedule"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#780301] text-white px-4 py-2.5 text-sm font-semibold shadow-sm"
            >
              My schedule (INS Form)
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/faculty/ins?tab=faculty"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-opticore-orange)] text-white px-4 py-2.5 text-sm font-semibold shadow-sm"
            >
              INS Form — all views
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/faculty/ins?tab=faculty&requestChange=1"
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold"
            >
              Request schedule change
            </Link>
          </div>
        </DashboardCard>

        <DashboardCard title="Assigned sections">
          <p className="text-sm text-black/65 mb-3">
            Program sections where you have class meetings this term, plus your advisory section (names only).
          </p>
          {assignedSectionLabels.length === 0 ? (
            <p className="text-sm text-black/55">No sections linked from your schedule for this term.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {assignedSectionLabels.map((name) => (
                <li
                  key={name}
                  className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-black shadow-sm"
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/faculty/announcements"
          className="flex items-center justify-between rounded-xl border border-black/10 bg-white p-4 shadow-sm hover:border-[var(--color-opticore-orange)]/40 transition-colors"
        >
          <span className="flex items-center gap-2 font-semibold text-black">
            <Megaphone className="w-5 h-5 text-[var(--color-opticore-orange)]" />
            View announcements
          </span>
          <ChevronRight className="w-4 h-4 text-black/40" />
        </Link>
        <Link
          href="/campus-navigation"
          className="flex items-center justify-between rounded-xl border border-black/10 bg-white p-4 shadow-sm hover:border-[var(--color-opticore-orange)]/40 transition-colors"
        >
          <span className="flex items-center gap-2 font-semibold text-black">
            <MapPin className="w-5 h-5 text-[var(--color-opticore-orange)]" />
            Use campus navigation
          </span>
          <ChevronRight className="w-4 h-4 text-black/40" />
        </Link>
      </div>
    </div>
  );
}
