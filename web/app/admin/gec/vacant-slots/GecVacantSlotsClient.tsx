"use client";

import { RequestAccessPanel, hasActiveScopeGrant } from "@/components/access/RequestAccessPanel";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { useAccessRequests } from "@/hooks/use-access-requests";

export function GecVacantSlotsClient() {
  const { requests } = useAccessRequests();
  const canEditVacant = hasActiveScopeGrant(requests, "gec_vacant_slots");

  return (
    <div className="px-8 pb-10 max-w-5xl space-y-6">
      <RequestAccessPanel variant="compact" requestsOverride={requests} />

      <DashboardCard title="Vacant slots (demo grid)">
        {!canEditVacant ? (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
            <strong>Read-only:</strong> Approve an access request that includes <strong>gec_vacant_slots</strong>, or use{" "}
            <strong>Request access</strong> in the sidebar.
          </p>
        ) : (
          <p className="text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 mb-4">
            <strong>Edit access active</strong> for vacant GEC slots (temporary grant). Changes still route through
            Evaluator in production.
          </p>
        )}
        <div className="overflow-x-auto rounded-lg border border-black/10">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="bg-[#ff990a] text-white">
                <th className="p-2">Section</th>
                <th className="p-2">GEC course</th>
                <th className="p-2">Day</th>
                <th className="p-2">Slot</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {[
                { sec: "BSIT 2A", course: "GEC-PC (vacant)", day: "Wed", slot: "09:00–11:00", st: "Vacant" },
                { sec: "BSIT 2B", course: "GEC-STS (vacant)", day: "Fri", slot: "13:00–15:00", st: "Vacant" },
              ].map((row, i) => (
                <tr key={i} className="border-t border-black/10">
                  <td className="p-2">{row.sec}</td>
                  <td className="p-2">{row.course}</td>
                  <td className="p-2">{row.day}</td>
                  <td className="p-2">{row.slot}</td>
                  <td className="p-2 font-semibold text-[#ff990a]">{row.st}</td>
                  <td className="p-2">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      disabled={!canEditVacant}
                      className="text-xs"
                    >
                      {canEditVacant ? "Assign (wire to Evaluator)" : "Locked"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-black/45 mt-3">
          Integrates with the same <code className="bg-black/[0.06] px-1 rounded">ScheduleEntry</code> data as the
          Evaluator; mutations restricted to GEC vacant keys in production.
        </p>
      </DashboardCard>
    </div>
  );
}
