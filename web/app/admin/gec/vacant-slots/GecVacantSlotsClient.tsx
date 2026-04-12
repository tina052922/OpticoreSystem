"use client";

import Link from "next/link";
import { getGecVacantSlotApprovalUiState } from "@/components/access/RequestAccessPanel";
import { GecVacantSlotsApprovalGate } from "@/components/access/GecVacantSlotsApprovalGate";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { useAccessRequests } from "@/hooks/use-access-requests";

/**
 * Reference page: editing happens in Central Hub Evaluator (per college) after one-time
 * `gec_vacant_slots` approval — no per-row approval on this screen.
 */
export function GecVacantSlotsClient() {
  const { requests, loading } = useAccessRequests();
  const approvalState = getGecVacantSlotApprovalUiState(requests);

  return (
    <div className="px-4 sm:px-8 pb-10 max-w-5xl space-y-6">
      <GecVacantSlotsApprovalGate state={approvalState} loading={loading} />

      <DashboardCard title="Vacant GEC slots">
        <p className="text-sm text-black/75 mb-4">
          Vacant GEC/GEE rows are stored as <strong>ScheduleEntry</strong> with the campus placeholder instructor. Use the{" "}
          <strong>Central Hub Evaluator</strong> to pick a college, view the full schedule, and edit only those vacant
          rows after College Admin approves your access once.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" asChild className="bg-[#780301] hover:bg-[#5a0201] text-white font-semibold">
            <Link href="/admin/gec/evaluator">Open Central Hub Evaluator</Link>
          </Button>
        </div>
      </DashboardCard>
    </div>
  );
}
