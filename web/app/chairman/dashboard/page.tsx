import { redirect } from "next/navigation";
import { CiDashboard } from "@/components/campus-intelligence/CiDashboard";
import { getChairmanSession } from "@/lib/auth/chairman-session";
import { getCampusIntelligenceStats } from "@/lib/server/campus-intelligence-stats";
import { getDashboardConflictBanner } from "@/lib/server/dashboard-conflicts";

export default async function ChairmanDashboardPage() {
  const session = await getChairmanSession();
  if (!session) redirect("/login");

  const [conflictBanner, liveStats] = await Promise.all([
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

  return (
    <div className="space-y-8 pb-8">
      <CiDashboard
        welcomeName={session.name}
        basePath="/chairman"
        variant="full"
        liveStats={liveStats}
        analyticsScope={{ mode: "program", collegeId: session.collegeId, programId: session.programId }}
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
