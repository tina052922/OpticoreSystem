import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireRoles } from "@/lib/auth/require-role";
import { getCurrentAcademicPeriod, getStudentScheduleRows } from "@/lib/server/dashboard-data";

export default async function StudentSchedulePage() {
  const profile = await requireRoles(["student"]);
  const period = await getCurrentAcademicPeriod();
  const { rows, section, program } = period
    ? await getStudentScheduleRows(profile.id, period.id)
    : { rows: [], section: null, program: null };

  const navItems = [
    { label: "Dashboard", href: "/student" },
    { label: "My schedule", href: "/student/schedule" },
    { label: "Announcements", href: "/student/announcements" },
    { label: "Campus navigation", href: "/campus-navigation" },
  ];

  return (
    <PortalShell
      userName={profile.name}
      userEmail={profile.email}
      sidebarBadge="Student"
      navItems={navItems}
      periodLabel={period?.name ?? "Current semester"}
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <Link
          href="/student"
          className="inline-flex items-center gap-2 text-sm font-medium text-black/70 hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-black">Full schedule</h1>
          <p className="text-sm text-black/60 mt-1">
            {program?.name ?? ""} · {section?.name ?? ""} · {period?.name ?? ""}
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-black/10 bg-white shadow-sm">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-black/10 bg-black/[0.03] text-left text-xs font-semibold uppercase tracking-wide text-black/55">
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Instructor</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-black/50">
                    No schedule rows for this term.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.entry.id} className="border-b border-black/5 hover:bg-black/[0.02]">
                    <td className="px-4 py-3 font-medium">{r.entry.day}</td>
                    <td className="px-4 py-3 tabular-nums text-black/80">
                      {r.entry.startTime}–{r.entry.endTime}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{r.subject?.code}</span>
                      <span className="text-black/65"> — {r.subject?.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-black/75">
                        <MapPin className="w-3.5 h-3.5" />
                        {r.room?.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-black/80">{r.instructor?.name ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PortalShell>
  );
}
