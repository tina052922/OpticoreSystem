import Link from "next/link";
import { ChevronRight, Clock, MapPin, Megaphone, Users, BookOpen } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { requireRoles } from "@/lib/auth/require-role";
import {
  countStudentsInSections,
  getCurrentAcademicPeriod,
  getInstructorScheduleRows,
  getStudentRosterForSections,
  sumWeeklyContactHours,
} from "@/lib/server/dashboard-data";

export default async function FacultyDashboardPage() {
  const profile = await requireRoles(["instructor"]);
  const period = await getCurrentAcademicPeriod();
  const { rows, sectionIds } = period
    ? await getInstructorScheduleRows(profile.id, period.id)
    : { rows: [], sectionIds: [] };
  const weeklyHours = sumWeeklyContactHours(rows);
  const studentCount = await countStudentsInSections(sectionIds);
  const roster = await getStudentRosterForSections(sectionIds);
  const sectionsLabel = [...new Set(rows.map((r) => r.section?.name).filter(Boolean))].join(", ") || "—";

  const navItems = [
    { label: "Dashboard", href: "/faculty" },
    { label: "INS Form (by faculty)", href: "/faculty/ins/faculty" },
    { label: "My schedule", href: "/faculty/schedule" },
    { label: "Request change", href: "/faculty/request-change" },
    { label: "Announcements", href: "/faculty/announcements" },
    { label: "Campus navigation", href: "/campus-navigation" },
  ];

  return (
    <PortalShell
      userName={profile.name}
      userEmail={profile.email}
      sidebarBadge="Faculty"
      navItems={navItems}
      periodLabel={period?.name ?? "Current semester"}
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-black tracking-tight">
            Welcome, {profile.name.replace(/^Prof\.\s*/i, "").split(",")[0]?.trim() ?? profile.name}
          </h1>
          <p className="text-sm text-black/60">{period?.name ?? "Academic period"} · CTU Argao</p>
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
              <p className="text-sm text-black/55">No assignments this term in the repository.</p>
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
                href="/faculty/ins/faculty"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#780301] text-white px-4 py-2.5 text-sm font-semibold shadow-sm"
              >
                INS Form (by faculty)
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
                href="/faculty/request-change"
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold"
              >
                Request schedule change
              </Link>
            </div>
          </DashboardCard>

          <DashboardCard title="Assigned sections & student list">
            <p className="text-sm text-black/65 mb-3">
              Roster is derived from student profiles linked to sections you teach.
            </p>
            {roster.length === 0 ? (
              <p className="text-sm text-black/55">No students found for your sections yet.</p>
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
    </PortalShell>
  );
}
