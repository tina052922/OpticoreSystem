import Link from "next/link";
import { Building2, ChevronRight, ClipboardList, Inbox, Send } from "lucide-react";
import { CiDashboard } from "@/components/campus-intelligence/CiDashboard";
import { RecentActivityCard } from "@/components/audit/RecentActivityCard";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

export default async function CollegeAdminDashboardPage() {
  const profile = await getAuthenticatedProfile();

  return (
    <div className="space-y-8 pb-8">
      <CiDashboard welcomeName={profile.name} basePath="/admin/college" variant="full" />

      <div className="px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RecentActivityCard />
          <DashboardCard title="Workflow">
            <ol className="space-y-3 text-sm text-black/75 list-decimal pl-5">
              <li>Open <strong>Inbox</strong> and review the draft forwarded by Chairman Admin.</li>
              <li>Use <strong>Schedule review</strong> to inspect Evaluator data and run conflict checks.</li>
              <li>Finalize at college scope, then forward to CAS Admin (simulated via Inbox / API).</li>
            </ol>
          </DashboardCard>

          <DashboardCard title="Quick actions">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/admin/college/inbox"
                className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/60"
              >
                <Inbox className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Inbox
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
                href="/admin/college/inbox"
                className="flex items-center gap-2 rounded-lg bg-[var(--color-opticore-orange)]/15 px-4 py-3 text-sm font-semibold text-black"
              >
                <Send className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Forward to CAS (see Inbox)
                <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
              </Link>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
