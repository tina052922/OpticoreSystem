import { CiDashboard } from "@/components/campus-intelligence/CiDashboard";
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
        analyticsScope={{ mode: "campus" }}
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
    </div>
  );
}
