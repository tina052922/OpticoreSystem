"use client";

import { useCallback, useEffect, useState } from "react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { Button } from "@/components/ui/button";
import { formatInstructorDepartmentLabel } from "@/lib/auth/instructor-department-label";
import { instructorRegistrationsApi, ApiClientError, invalidateApiCache, type InstructorRegistrationRow } from "@/lib/api/client";
import { useOpticoreToast } from "@/components/alerts/OpticoreToastProvider";
import { useRealtimeEvent } from "@/hooks/use-realtime-event";

export function ChairmanInstructorRegistrationsClient() {
  const toast = useOpticoreToast();
  const [rows, setRows] = useState<InstructorRegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await instructorRegistrationsApi.list({ status: "pending" });
      setRows(data.registrations ?? []);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to load registrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeEvent("badge.changed", (event) => {
    if (event.payload?.badge !== "instructor_registrations") return;
    void load();
  });

  async function review(id: string, action: "approve" | "reject") {
    setBusyId(`${id}:${action}`);
    try {
      const res = await instructorRegistrationsApi.review(id, { action, note: note.trim() || undefined });
      invalidateApiCache("/api/catalog");
      toast.success(action === "approve" ? "Instructor approved" : "Instructor rejected", res.message);
      setNote("");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      toast.error(
        "Could not update registration",
        e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <ChairmanPageHeader title="Instructor registrations" />
      <div className="px-4 md:px-8 pb-10 max-w-[1100px] mx-auto space-y-4">
        <p className="text-[13px] text-black/65">
          Approve new instructor accounts for your program before they can sign in or be assigned when plotting.
          Employee ID stays linked to Faculty Profile so schedules attach after approval.
        </p>
        {error ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        ) : null}
        {loading ? (
          <p className="text-sm text-black/55">Loading pending registrations…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-black/55 border border-black/10 bg-white rounded-lg px-3 py-6 text-center">
            No pending instructor registrations in your program.
          </p>
        ) : (
          <div className="space-y-3">
            <label className="block text-[12px] font-medium text-black/70">
              Note (optional, sent to the instructor on reject)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-black/20 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[860px] text-[12px] bg-white">
                <thead>
                  <tr className="bg-[#1e3a5f] text-white">
                    <th className="border border-black/20 px-2 py-2 text-left">Name</th>
                    <th className="border border-black/20 px-2 py-2 text-left">Employee ID</th>
                    <th className="border border-black/20 px-2 py-2 text-left">Email</th>
                    <th className="border border-black/20 px-2 py-2 text-left">Department</th>
                    <th className="border border-black/20 px-2 py-2 text-left">Designation</th>
                    <th className="border border-black/20 px-2 py-2 text-left">Submitted</th>
                    <th className="border border-black/20 px-2 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="border border-black/20 px-2 py-2 font-medium">{r.profile?.fullName || r.name}</td>
                      <td className="border border-black/20 px-2 py-2 tabular-nums">{r.employeeId ?? "—"}</td>
                      <td className="border border-black/20 px-2 py-2">{r.email}</td>
                      <td className="border border-black/20 px-2 py-2">
                        {formatInstructorDepartmentLabel({
                          collegeCode: r.collegeCode,
                          collegeName: r.collegeName,
                          programCode: r.programCode,
                          programName: r.programName,
                        })}
                      </td>
                      <td className="border border-black/20 px-2 py-2">{r.profile?.designation || r.profile?.status || "—"}</td>
                      <td className="border border-black/20 px-2 py-2">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                      </td>
                      <td className="border border-black/20 px-2 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId !== null}
                            onClick={() => void review(r.id, "approve")}
                          >
                            {busyId === `${r.id}:approve` ? "Approving…" : "Approve"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyId !== null}
                            onClick={() => void review(r.id, "reject")}
                          >
                            {busyId === `${r.id}:reject` ? "Rejecting…" : "Reject"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
