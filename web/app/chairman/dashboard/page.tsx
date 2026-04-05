import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Building2, ChevronRight, ClipboardList, Inbox, Layers } from "lucide-react";
import { CiDashboard } from "@/components/campus-intelligence/CiDashboard";
import { RecentActivityCard } from "@/components/audit/RecentActivityCard";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { getChairmanSession } from "@/lib/auth/chairman-session";

export default async function ChairmanDashboardPage() {
  const session = await getChairmanSession();
  if (!session) redirect("/login");

  return (
    <div className="space-y-8 pb-8">
      <CiDashboard welcomeName={session.name} basePath="/chairman" variant="full" />

      <div className="px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RecentActivityCard auditHref={null} />

          <DashboardCard title="Workflow">
            <ol className="space-y-3 text-sm text-black/75 list-decimal pl-5">
              <li>
                Use <strong>Inbox</strong> to coordinate drafts and messages with College Admin.
              </li>
              <li>
                Use <strong>Evaluator</strong> to plot and save schedules for your assigned program.
              </li>
              <li>
                Open <strong>INS Form</strong> views (faculty, section, room) for published timetables and conflict
                checks.
              </li>
            </ol>
          </DashboardCard>

          <DashboardCard title="Quick actions">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/chairman/inbox"
                className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/60"
              >
                <Inbox className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Inbox
              </Link>
              <Link
                href="/chairman/evaluator"
                className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/60"
              >
                <ClipboardList className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Evaluator
              </Link>
              <Link
                href="/chairman/ins/faculty"
                className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/60"
              >
                <BookOpen className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                INS Form (Schedule View)
              </Link>
              <Link
                href="/campus-navigation"
                className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/60"
              >
                <Building2 className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Campus navigation
              </Link>
              <Link
                href="/chairman/subject-codes"
                className="flex items-center gap-2 rounded-lg bg-[var(--color-opticore-orange)]/15 px-4 py-3 text-sm font-semibold text-black sm:col-span-2"
              >
                <Layers className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Subject codes
                <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
              </Link>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
