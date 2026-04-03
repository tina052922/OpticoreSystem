import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireRoles } from "@/lib/auth/require-role";
import { getCurrentAcademicPeriod, getInstructorScheduleRows } from "@/lib/server/dashboard-data";

export default async function FacultySchedulePage() {
  const profile = await requireRoles(["instructor"]);
  const period = await getCurrentAcademicPeriod();
  const { rows } = period ? await getInstructorScheduleRows(profile.id, period.id) : { rows: [] };

  const navItems = [
    { label: "Dashboard", href: "/faculty" },
    { label: "My schedule", href: "/faculty/schedule" },
    { label: "Request change", href: "/faculty/request-change" },
    { label: "Announcements", href: "/faculty/announcements" },
    { label: "Campus navigation", href: "/campus-navigation" },
  ];

  return (
    <PortalShell userName={profile.name} userEmail={profile.email} sidebarBadge="Faculty" navItems={navItems}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <Link href="/faculty" className="inline-flex items-center gap-2 text-sm font-medium text-black/70 hover:text-black">
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-black">My teaching schedule</h1>
        <div className="overflow-x-auto rounded-xl border border-black/10 bg-white shadow-sm">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-black/10 bg-black/[0.03] text-left text-xs font-semibold uppercase tracking-wide text-black/55">
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Room</th>
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
                    <td className="px-4 py-3 tabular-nums">
                      {r.entry.startTime}–{r.entry.endTime}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{r.subject?.code}</span>
                      <span className="text-black/65"> — {r.subject?.title}</span>
                    </td>
                    <td className="px-4 py-3">{r.section?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-black/75">
                        <MapPin className="w-3.5 h-3.5" />
                        {r.room?.code}
                      </span>
                    </td>
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
