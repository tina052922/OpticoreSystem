"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Megaphone, ChevronRight, Clock } from "lucide-react";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import type { ScheduleRowView } from "@/lib/server/dashboard-data";
import type { Notification, Program, Section } from "@/types/db";

type StudentPayload = {
  rows: ScheduleRowView[];
  section: Section | null;
  program: Program | null;
};

export function StudentDashboardTermClient({
  profileName,
  notifications,
}: {
  profileName: string;
  notifications: Notification[];
}) {
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
  const upcoming = rows.slice(0, 4);

  const displayName = profileName.split(",")[0]?.trim() ?? profileName;
  const periodLabel = selectedPeriod?.name;

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
          {program ? `${program.name}` : "Program"}
          {section ? ` · ${section.name}` : ""}
          {periodLabel ? ` · ${periodLabel}` : ""}
          {loading ? <span className="ml-2 text-black/40">Updating…</span> : null}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DashboardCard title="My schedule (selected semester)">
            {rows.length === 0 ? (
              <p className="text-sm text-black/55">
                No class meetings for your section in this term. If you just enrolled, ask the registrar to link your
                profile to a section.
              </p>
            ) : (
              <ul className="divide-y divide-black/10 rounded-lg border border-black/10 overflow-hidden">
                {rows.slice(0, 8).map((r) => (
                  <li
                    key={r.entry.id}
                    className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm bg-white hover:bg-black/[0.02]"
                  >
                    <span className="font-medium text-black min-w-[72px]">{r.entry.day}</span>
                    <span className="text-black/70 tabular-nums">
                      {r.entry.startTime}–{r.entry.endTime}
                    </span>
                    <span className="text-black font-medium flex-1 min-w-[120px]">
                      {r.subject?.code ?? "Subject"} — {r.subject?.title ?? ""}
                    </span>
                    <span className="text-black/60 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {r.room?.code ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/student/schedule"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-opticore-orange)] text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:opacity-95"
              >
                View full schedule
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/campus-navigation"
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-black/[0.03]"
              >
                <MapPin className="w-4 h-4" />
                Campus navigation
              </Link>
            </div>
          </DashboardCard>

          <DashboardCard title="Upcoming classes">
            {upcoming.length === 0 ? (
              <p className="text-sm text-black/55">No upcoming entries in your timetable for this term.</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((r) => (
                  <li
                    key={`up-${r.entry.id}`}
                    className="flex gap-3 rounded-lg border border-black/10 p-3 bg-[#fafafa]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-opticore-orange)]/15 text-[var(--color-opticore-orange)]">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-black text-sm truncate">
                        {r.subject?.code} · {r.subject?.title}
                      </p>
                      <p className="text-xs text-black/55">
                        {r.entry.day} · {r.entry.startTime}–{r.entry.endTime} · {r.room?.code}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </div>

        <div className="space-y-6">
          <DashboardCard title="Announcements">
            {notifications.length === 0 ? (
              <div className="flex items-start gap-2 text-sm text-black/55">
                <Megaphone className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-opticore-orange)]" />
                <span>No advisories yet. Department posts will appear here.</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {notifications.map((n) => (
                  <li key={n.id} className="text-sm border-b border-black/5 pb-3 last:border-0 last:pb-0">
                    <p className="text-black/85">{n.message}</p>
                    <p className="text-xs text-black/40 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/student/announcements"
              className="mt-4 inline-flex w-full justify-center items-center gap-2 rounded-lg border border-black/15 py-2.5 text-sm font-semibold hover:bg-black/[0.03]"
            >
              View announcements
              <ChevronRight className="w-4 h-4" />
            </Link>
          </DashboardCard>

          <div className="rounded-xl border border-dashed border-black/15 bg-white/80 p-4 text-xs text-black/50 leading-relaxed">
            <Calendar className="w-4 h-4 mb-2 text-[var(--color-opticore-orange)]" />
            Schedules follow the official repository in OptiCore. Use the semester selector in the navigation bar to
            switch terms.
          </div>
        </div>
      </div>
    </div>
  );
}
