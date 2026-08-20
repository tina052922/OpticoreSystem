import { redirect } from "next/navigation";
import { CiDashboard } from "@/components/campus-intelligence/CiDashboard";
import { getChairmanSession } from "@/lib/auth/chairman-session";
import { getCampusIntelligenceStats } from "@/lib/server/campus-intelligence-stats";
import { getDashboardConflictBanner } from "@/lib/server/dashboard-conflicts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ChairmanDashboardPage() {
  const session = await getChairmanSession();
  if (!session) redirect("/login");

  // Check if user has required scope
  const hasMissingScope = !session.collegeId || !session.programId;

  const [conflictBanner, analyticsData] = await Promise.all([
    getDashboardConflictBanner({
      mode: "chairman_program",
      collegeId: session.collegeId,
      programId: session.programId,
    }),
    getCampusIntelligenceStats({
      mode: "chairman_program",
      collegeId: session.collegeId,
      programId: session.programId,
    }),
  ]);

  const chartsData = {
    roomUtilizationBySlot: analyticsData.roomUtilizationBySlot,
    facultyLoadDistribution: analyticsData.facultyLoadDistribution,
  };

  return (
    <div className="space-y-8 pb-8">
      {hasMissingScope && (
        <div className="px-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900">
              Missing Account Configuration
            </h3>
            <p className="text-sm text-amber-800 mt-1">
              Your account is missing college or program assignment. Please{" "}
              <a href="/chairman/profile" className="underline font-medium">
                update your profile
              </a>{" "}
              or contact an administrator.
            </p>
          </div>
        </div>
      )}

      <CiDashboard
        welcomeName={session.name ?? "Chairman"}
        basePath="/chairman"
        variant="full"
        liveStats={analyticsData}
        chartsData={chartsData}
        analyticsScope={{
          mode: "program",
          collegeId: session.collegeId,
          programId: session.programId,
        }}
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
