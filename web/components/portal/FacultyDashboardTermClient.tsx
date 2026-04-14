"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Clock, MapPin, Megaphone, Users, BookOpen } from "lucide-react";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import type { ScheduleRowView } from "@/lib/server/dashboard-data";
import type { User } from "@/types/db";

type FacultyPayload = {
  rows: ScheduleRowView[];
  sectionIds: string[];
  studentCount: number;
  roster: User[];
  weeklyHours: number;
};

/** Dashboard body: schedule, load, and roster follow the shell semester filter (API + selected period). */
export function FacultyDashboardTermClient({ profileName }: { profileName: string }) {
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
  const studentCount = data?.studentCount ?? 0;
  const roster = data?.roster ?? [];

  const sectionsLabel = useMemo(
    () => [...new Set(rows.map((r) => r.section?.name).filter(Boolean))].join(", ") || "—",
    [rows],
  );

  const displayName = profileName.replace(/^Prof\.\s*/i, "").split(",")[0]?.trim() ?? profileName;
  const periodLabel = selectedPeriod?.name ?? "Academic period";

  if (!ready || !selectedPeriodId) {
    return <p className="text-sm text-black/55 px-4 sm:px-6">Loading academic term…</p>;
  }

  if (err) {
    return <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4 mx-4 sm:mx-6">{err}</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold text-black tracking-tight">Welcome, {displayName}</h1>
        <p className="text-sm text-black/60">
          {periodLabel} · CTU Argao
          {loading ? <span className="ml-2 text-black/40">Updating…</span> : null}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-black/10 p-4 shadow-sm flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-[var(--color-opticore-orange)]/15 flex items-center justify-center text-[var(--color-opticore-orange)]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-black/50 uppercase tracking-wide">Weekly contact (est.)</p>
            <p className="text-xl font-bold text-black">{weeklyHours} hrs</p>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-black/10 p-4 shadow-sm flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-[var(--color-opticore-orange)]/15 flex items-center justify-center text-[var(--color-opticore-orange)]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-black/50 uppercase tracking-wide">Teaching blocks</p>
            <p className="text-xl font-bold text-black">{rows.length}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-black/10 p-4 shadow-sm flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-[var(--color-opticore-orange)]/15 flex items-center justify-center text-[var(--color-opticore-orange)]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-black/50 uppercase tracking-wide">Students (assigned sections)</p>
            <p className="text-xl font-bold text-black">{studentCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="My teaching schedule & load">
          <p className="text-xs text-black/50 mb-3">Sections: {sectionsLabel}</p>
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
              href="/faculty/ins"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#780301] text-white px-4 py-2.5 text-sm font-semibold shadow-sm"
            >
              INS Forms Schedule View
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/faculty/schedule"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-opticore-orange)] text-white px-4 py-2.5 text-sm font-semibold shadow-sm"
            >
              View my schedule
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/faculty/schedule"
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold"
            >
              Request schedule change
            </Link>
          </div>
        </DashboardCard>

        <DashboardCard title="Assigned sections & student list">
          <p className="text-sm text-black/65 mb-3">
            Roster is derived from student profiles linked to sections you teach (selected term).
          </p>
          {roster.length === 0 ? (
            <p className="text-sm text-black/55">No students found for your sections in this term.</p>
          ) : (
            <ul className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
              {roster.map((s) => (
                <li
                  key={s.id}
                  className="flex justify-between gap-2 rounded-lg border border-black/8 px-3 py-2 text-sm bg-[#fafafa]"
                >
                  <span className="font-medium text-black truncate">{s.name}</span>
                  <span className="text-black/45 text-xs shrink-0">{s.email}</span>
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
