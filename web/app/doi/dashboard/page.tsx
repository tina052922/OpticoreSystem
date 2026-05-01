import Link from "next/link";
import { CalendarPlus, ChevronRight, ClipboardList, MapPin, Scale } from "lucide-react";
import { CiDashboard } from "@/components/campus-intelligence/CiDashboard";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";
import { getCampusIntelligenceStats } from "@/lib/server/campus-intelligence-stats";
import { getDashboardConflictBanner } from "@/lib/server/dashboard-conflicts";

export default async function DoiDashboardPage() {
  const profile = await getAuthenticatedProfile();

  const [conflictBanner, liveStats] = await Promise.all([
    getDashboardConflictBanner({
      mode: "doi_campus",
      collegeId: null,
      programId: null,
    }),
    getCampusIntelligenceStats({ mode: "doi_campus" }),
  ]);

  return (
    <div className="space-y-8 pb-8">
      <CiDashboard
        welcomeName={profile.name}
        basePath="/doi"
        variant="doi"
        liveStats={liveStats}
        scopeHint="Full campus — all colleges and programs (VPAA / institutional view)"
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

      <div className="px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DashboardCard title="DOI responsibilities">
            <ul className="space-y-2 text-sm text-black/75">
              <li className="flex gap-2">
                <ClipboardList className="w-4 h-4 mt-0.5 text-[var(--color-opticore-orange)] shrink-0" />
                View campus-wide schedules and validation status
              </li>
              <li className="flex gap-2">
                <Scale className="w-4 h-4 mt-0.5 text-[var(--color-opticore-orange)] shrink-0" />
                Review load-policy justifications on the Policy reviews page; chairs submit text when load policies are
                violated
              </li>
            </ul>
          </DashboardCard>

          <DashboardCard title="Quick actions">
            <Link
              href="/doi/ins/faculty"
              className="flex items-center justify-between rounded-lg bg-[#780301] text-white px-4 py-3 text-sm font-semibold shadow-sm hover:opacity-95"
            >
              <span className="flex items-center gap-2">
                <CalendarPlus className="w-4 h-4" />
                INS Form — campus-wide schedules &amp; VPAA approval
              </span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="#policy-justifications"
              className="mt-3 flex items-center justify-between rounded-lg bg-[var(--color-opticore-orange)] text-white px-4 py-3 text-sm font-semibold shadow-sm hover:opacity-95"
            >
              Jump to policy justifications
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/campus-navigation"
              className="mt-3 flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 text-sm font-medium hover:bg-black/[0.02]"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Campus navigation
              </span>
              <ChevronRight className="w-4 h-4 text-black/35" />
            </Link>
          </DashboardCard>
        </div>
      </div>

      <div id="policy-justifications" className="px-6 max-w-6xl mx-auto scroll-mt-24">
        <DashboardCard title="Policy justifications">
          <p className="text-sm text-black/70 mb-4">
            Accept or reject chair submissions in one place. The sidebar shows how many are still pending for VPAA review.
          </p>
          <Link
            href="/doi/reviews"
            className="inline-flex items-center gap-2 rounded-lg bg-[#780301] text-white px-4 py-2.5 text-sm font-semibold hover:opacity-95"
          >
            Go to Policy reviews
            <ChevronRight className="w-4 h-4" />
          </Link>
        </DashboardCard>
      </div>
    </div>
  );
}
