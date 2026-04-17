import Link from "next/link";
import { BookOpen, ClipboardList, KeyRound, MapPin, Shield } from "lucide-react";
import { CiDashboard } from "@/components/campus-intelligence/CiDashboard";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";
import { getCampusIntelligenceStats } from "@/lib/server/campus-intelligence-stats";
import { getDashboardConflictBanner } from "@/lib/server/dashboard-conflicts";

export default async function GecChairmanDashboardPage() {
  const profile = await getAuthenticatedProfile();

  const [conflictBanner, liveStats] = await Promise.all([
    getDashboardConflictBanner({
      mode: "gec_campus",
      collegeId: null,
      programId: null,
    }),
    getCampusIntelligenceStats({ mode: "gec_campus" }),
  ]);

  return (
    <div className="space-y-8 pb-8">
      <CiDashboard
        welcomeName={profile.name}
        basePath="/admin/gec"
        variant="gec"
        liveStats={liveStats}
        scopeHint="Campus-wide — all colleges, programs, rooms, and faculty in the catalog"
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
          <DashboardCard title="How your access works">
            <ol className="space-y-3 text-sm text-black/75 list-decimal pl-5">
              <li>
                Open <strong>Central Hub Evaluator</strong> to review campus-wide scheduling context (same hub as other
                admins; GEC-specific edits are still limited by policy below).
              </li>
              <li>
                To <strong>edit vacant GEC slots</strong>, use the single{" "}
                <strong>Request approval to edit vacant GEC slots</strong> action on the evaluator hub (or{" "}
                <Link href="/admin/gec/request-access" className="text-[#780301] font-semibold underline">
                  request-access
                </Link>
                ). College Admin approves once; you then edit all vacant GEC rows from the hub, not per slot.
              </li>
              <li>
                Use <strong>INS Form</strong> for faculty / section / room views; vacant GEC times are outlined in orange.
              </li>
            </ol>
            <p className="text-xs text-black/50 mt-4 flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              CAS aligns GEC policy; College Admin gates temporary edit access for vacant cells.
            </p>
          </DashboardCard>
          <DashboardCard title="Shortcuts">
            <div className="space-y-3">
              <Link
                href="/admin/gec/evaluator"
                className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/50"
              >
                <ClipboardList className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Central Hub Evaluator
              </Link>
              <Link
                href="/admin/gec/request-access"
                className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/50"
              >
                <KeyRound className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Request Approval to Edit Vacant GEC Slots
              </Link>
              <Link
                href="/admin/gec/ins/faculty"
                className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/50"
              >
                <BookOpen className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                INS Form (Schedule View)
              </Link>
              <Link
                href="/campus-navigation"
                className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/50"
              >
                <MapPin className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Campus navigation
              </Link>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
