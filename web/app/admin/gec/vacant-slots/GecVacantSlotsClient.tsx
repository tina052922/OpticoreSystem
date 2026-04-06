"use client";

import { useState } from "react";
import { RequestAccessPanel, hasActiveScopeGrant } from "@/components/access/RequestAccessPanel";
import { GecAccessRequestModal } from "@/components/access/GecAccessRequestModal";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { useAccessRequests } from "@/hooks/use-access-requests";

/** Demo rows: vacant slots are editable only with approved scope; occupied slots are never editable here. */
const DEMO_ROWS = [
  {
    id: "1",
    section: "BSIT 2A",
    course: "GEC-PC",
    day: "Wednesday",
    slot: "09:00–11:00",
    status: "vacant" as const,
  },
  {
    id: "2",
    section: "BSIT 2B",
    course: "GEC-STS",
    day: "Friday",
    slot: "13:00–15:00",
    status: "vacant" as const,
  },
  {
    id: "3",
    section: "BSIT 3A",
    course: "GEC-ETHICS",
    day: "Monday",
    slot: "10:00–12:00",
    status: "occupied" as const,
  },
];

export function GecVacantSlotsClient() {
  const { requests, reload } = useAccessRequests();
  const canEditVacant = hasActiveScopeGrant(requests, "gec_vacant_slots");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState("");
  const [assignInfo, setAssignInfo] = useState<string | null>(null);

  function openRequestFor(row: (typeof DEMO_ROWS)[0]) {
    setModalContext(`${row.course} · ${row.section} · ${row.day} ${row.slot}`);
    setModalOpen(true);
  }

  function onAssignClick(row: (typeof DEMO_ROWS)[0]) {
    if (row.status === "occupied") return;
    if (!canEditVacant) {
      openRequestFor(row);
      return;
    }
    setAssignInfo(
      `Vacant GEC slot — ${row.course} · ${row.section} · ${row.day} ${row.slot}. You may coordinate assignment through your college’s Evaluator / schedule workflow (ScheduleEntry).`,
    );
  }

  return (
    <div className="px-4 sm:px-8 pb-10 max-w-5xl space-y-6">
      <RequestAccessPanel variant="compact" requestsOverride={requests} />

      <DashboardCard title="Vacant GEC slots (CHED GEC — all programs)">
        <p className="text-sm text-black/75 mb-4">
          GEC Chairman works on <strong>core / general education</strong> vacancies across colleges/programs. Only{" "}
          <strong className="text-[#FF990A]">Vacant</strong> GEC rows may be assigned; <strong>Occupied</strong> slots are
          read-only. Coordination follows <strong>CAS Admin</strong>; <strong>College Admin (COTE)</strong> approves edit
          access via <strong>Access requests</strong>.
        </p>

        {!canEditVacant ? (
          <p className="text-sm text-amber-950 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
            <strong>Read-only:</strong> You do not have an active <code className="bg-black/[0.06] px-1">gec_vacant_slots</code>{" "}
            grant. Click <strong>Assign</strong> on a <strong>vacant</strong> row to submit an approval request, or use{" "}
            <strong>Request access</strong> in the sidebar. <strong>College Admin</strong> approves in{" "}
            <strong>Access requests</strong> (College dashboard).
          </p>
        ) : (
          <p className="text-sm text-emerald-950 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 mb-4">
            <strong>Edit access active</strong> for vacant GEC slots (temporary grant from College Admin). You can proceed
            with vacant-slot actions below.
          </p>
        )}

        {assignInfo ? (
          <p className="text-sm text-blue-950 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-4">{assignInfo}</p>
        ) : null}

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
              {DEMO_ROWS.map((row) => {
                const isVacant = row.status === "vacant";
                return (
                  <tr key={row.id} className="border-t border-black/10">
                    <td className="p-2">{row.section}</td>
                    <td className="p-2 font-medium">{row.course}</td>
                    <td className="p-2">{row.day}</td>
                    <td className="p-2 tabular-nums">{row.slot}</td>
                    <td className="p-2">
                      <span
                        className={
                          isVacant ? "font-semibold text-[#ff990a]" : "font-semibold text-gray-700"
                        }
                      >
                        {isVacant ? "Vacant" : "Occupied"}
                      </span>
                    </td>
                    <td className="p-2">
                      {isVacant ? (
                        <Button
                          size="sm"
                          type="button"
                          className={
                            canEditVacant
                              ? "bg-[#780301] hover:bg-[#5a0201] text-white text-xs"
                              : "bg-[#FF990A] hover:bg-[#e88909] text-white text-xs"
                          }
                          onClick={() => onAssignClick(row)}
                        >
                          {canEditVacant ? "Assign" : "Request approval"}
                        </Button>
                      ) : (
                        <Button size="sm" type="button" variant="outline" disabled className="text-xs opacity-60">
                          Not vacant
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-black/45 mt-3">
          Integrates with the same <code className="bg-black/[0.06] px-1 rounded">ScheduleEntry</code> repository as the
          Central Hub; production wiring filters GEC subjects and vacant cells only.
        </p>
      </DashboardCard>

      <GecAccessRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        contextLabel={modalContext}
        onSuccess={() => void reload()}
      />
    </div>
  );
}
