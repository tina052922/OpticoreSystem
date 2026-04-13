import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { OpticoreInsForm5A } from "@/components/ins/ins-layout/OpticoreInsDocuments";
import type { InsFacultyFormSummary } from "@/lib/ins/build-ins-faculty-view";
import { requireRoles } from "@/lib/auth/require-role";
import { getCurrentAcademicPeriod, getInstructorScheduleRows } from "@/lib/server/dashboard-data";
import { buildPortalFacultyIns5A } from "@/lib/portal/build-portal-ins-forms";

export default async function FacultySchedulePage() {
  const profile = await requireRoles(["instructor"]);
  const period = await getCurrentAcademicPeriod();
  const { rows } = period ? await getInstructorScheduleRows(profile.id, period.id) : { rows: [] };

  const { schedule, courses, teachingMetrics } = buildPortalFacultyIns5A(rows, period?.id ?? "", profile.id);
  const facultyFormSummary: InsFacultyFormSummary = {
    ...teachingMetrics,
    administrativeDesignation: null,
    production: null,
    extension: null,
    research: null,
  };

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
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-4">
        <Link
          href="/faculty"
          className="inline-flex items-center gap-2 text-sm font-medium text-black/70 hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-800">My teaching schedule</h1>
          <p className="text-gray-600 text-sm mt-1">
            INS Form 5A — Program by Teacher (your teaching load only). Matches the official grid format used in Campus
            Intelligence.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-950 px-4 py-3 text-sm">
            No schedule entries are assigned to you for this term. Contact your chair or college admin if this is
            unexpected.
          </div>
        ) : null}

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
          <OpticoreInsForm5A
            facultyName={profile.name}
            schedule={schedule}
            courses={courses}
            readOnly
            semesterLabel={period?.name ?? "—"}
            facultyFormSummary={facultyFormSummary}
          />
        </div>
      </div>
    </PortalShell>
  );
}
