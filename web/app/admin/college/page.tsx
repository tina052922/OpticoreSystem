import Link from "next/link";
import { Building2, ChevronRight, ClipboardList, Inbox, KeyRound, ScrollText } from "lucide-react";
import { CiDashboard } from "@/components/campus-intelligence/CiDashboard";
import { RecentActivityCard } from "@/components/audit/RecentActivityCard";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";
import { getCampusIntelligenceStats } from "@/lib/server/campus-intelligence-stats";
import { getDashboardConflictBanner } from "@/lib/server/dashboard-conflicts";

export default async function CollegeAdminDashboardPage() {
  const profile = await getAuthenticatedProfile();

  const [conflictBanner, liveStats] = await Promise.all([
    getDashboardConflictBanner({
      mode: "college",
      collegeId: profile.collegeId,
      programId: null,
    }),
    getCampusIntelligenceStats({
      mode: "college",
      collegeId: profile.collegeId,
    }),
  ]);

  return (
    <div className="space-y-8 pb-8">
      <CiDashboard
        welcomeName={profile.name}
        basePath="/admin/college"
        variant="full"
        liveStats={liveStats}
        scopeHint="Your entire college — all programs, sections, rooms linked to the college, and college faculty"
        conflictBanner={
          conflictBanner
            ? {
                conflictingRowCount: conflictBanner.conflictingRowCount,
                previewLines: conflictBanner.previewLines,
                evaluatorHref: conflictBanner.evaluatorHref,
              }
            : null
        }
      />

      <div className="px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RecentActivityCard />
          <DashboardCard title="Workflow">
            <ol className="space-y-3 text-sm text-black/75 list-decimal pl-5">
              <li>
                <strong>Central Hub Evaluator</strong> and <strong>INS Forms</strong> read live{" "}
                <code className="text-xs bg-black/5 px-1 rounded">ScheduleEntry</code> rows — Chairman and GEC edits
                appear immediately.
              </li>
              <li>
                Use <strong>Audit log</strong> (Recent activity) and <strong>Schedule review</strong> to trace who
                changed what and to run conflict checks.
              </li>
            </ol>
          </DashboardCard>

          <DashboardCard title="Quick actions">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/admin/college/access-requests"
                className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/60"
              >
                <KeyRound className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Access requests (GEC / CAS)
              </Link>
              <Link
                href="/admin/college/evaluator"
                className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/60"
              >
                <ClipboardList className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Central Hub Evaluator
              </Link>
              <Link
                href="/admin/college/audit-log"
                className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/60"
              >
                <ScrollText className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Audit log
              </Link>
              <Link
                href="/admin/college/schedule-review"
                className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/60"
              >
                <ClipboardList className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Schedule review
              </Link>
              <Link
                href="/campus-navigation"
                className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/60"
              >
                <Building2 className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Campus navigation
              </Link>
              <Link
                href="/admin/cas/inbox"
                className="flex items-center gap-2 rounded-lg bg-[var(--color-opticore-orange)]/15 px-4 py-3 text-sm font-semibold text-black"
              >
                <Inbox className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                CAS Inbox (coordination)
                <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
              </Link>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
