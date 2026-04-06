import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FacultyScheduleChangeForm } from "@/components/faculty/FacultyScheduleChangeForm";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireRoles } from "@/lib/auth/require-role";

export default async function FacultyRequestChangePage() {
  const profile = await requireRoles(["instructor"]);
  const navItems = [
    { label: "Dashboard", href: "/faculty" },
    { label: "INS Form (by faculty)", href: "/faculty/ins/faculty" },
    { label: "My schedule", href: "/faculty/schedule" },
    { label: "Request change", href: "/faculty/request-change" },
    { label: "Announcements", href: "/faculty/announcements" },
    { label: "Campus navigation", href: "/campus-navigation" },
  ];

  return (
    <PortalShell userName={profile.name} userEmail={profile.email} sidebarBadge="Faculty" navItems={navItems}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
        <Link href="/faculty" className="inline-flex items-center gap-2 text-sm font-medium text-black/70 hover:text-black">
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-black">Request schedule change</h1>
          <p className="text-sm text-black/55">
            Submit a proposed change to a class meeting from your current timetable. College Admin will review it, run a
            conflict check, and notify you when it is approved or rejected.
          </p>
        </header>
        <div className="rounded-xl border border-black/10 bg-white p-6 shadow-[0px_4px_4px_rgba(0,0,0,0.06)]">
          <FacultyScheduleChangeForm />
        </div>
      </div>
    </PortalShell>
  );
}
