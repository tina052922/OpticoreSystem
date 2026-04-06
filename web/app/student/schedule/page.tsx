import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { OpticoreInsForm5B } from "@/components/ins/ins-layout/OpticoreInsDocuments";
import { requireRoles } from "@/lib/auth/require-role";
import { getCurrentAcademicPeriod, getStudentScheduleRows } from "@/lib/server/dashboard-data";
import { buildPortalStudentIns5B } from "@/lib/portal/build-portal-ins-forms";

export default async function StudentSchedulePage() {
  const profile = await requireRoles(["student"]);
  const period = await getCurrentAcademicPeriod();
  const { rows, section, program } = period
    ? await getStudentScheduleRows(profile.id, period.id)
    : { rows: [], section: null, program: null };

  const { schedule, courses } = buildPortalStudentIns5B(rows);

  const degreeAndYear =
    program && section
      ? `${program.name} · Year level ${section.yearLevel}`
      : program?.name ?? "—";
  const assignment = section?.name ?? "—";

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
            semesterLabel={period?.name ?? "—"}
          />
        </div>
      </div>
    </PortalShell>
  );
}
