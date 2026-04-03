"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AccessRequestRow } from "@/types/db";

type Row = AccessRequestRow & { requesterName?: string };

export function AccessRequestsReview() {
  const [requests, setRequests] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/access-requests", { credentials: "include" });
    const data = (await res.json().catch(() => null)) as { requests?: Row[]; error?: string } | null;
    if (!res.ok) {
      setError(data?.error || "Failed to load");
      return;
    }
    setRequests(data?.requests ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, status: "approved" | "rejected") {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/access-requests/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Update failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const rest = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-8">
      {error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold mb-3">Pending</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-black/55">No pending access requests.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/10">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="bg-[#ff990a] text-white">
                  <th className="p-2">Requester</th>
                  <th className="p-2">Scopes</th>
                  <th className="p-2">Note</th>
                  <th className="p-2">Submitted</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {pending.map((r) => (
                  <tr key={r.id} className="border-t border-black/10">
                    <td className="p-2 font-medium">{r.requesterName ?? r.requesterId}</td>
                    <td className="p-2">{(r.scopes ?? []).join(", ")}</td>
                    <td className="p-2 max-w-xs truncate" title={r.note ?? ""}>
                      {r.note || "—"}
                    </td>
                    <td className="p-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="p-2 space-x-2">
                      <Button
                        size="sm"
                        type="button"
                        className="bg-emerald-700 hover:bg-emerald-800"
                        disabled={busy === r.id}
                        onClick={() => void decide(r.id, "approved")}
                      >
                        {busy === r.id ? "…" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        disabled={busy === r.id}
                        onClick={() => void decide(r.id, "rejected")}
                      >
                        Reject
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">History</h2>
        {rest.length === 0 ? (
          <p className="text-sm text-black/55">No completed requests yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/10">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="bg-black/[0.06]">
                  <th className="p-2">Requester</th>
                  <th className="p-2">Scopes</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Expires</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((r) => (
                  <tr key={r.id} className="border-t border-black/10 bg-white">
                    <td className="p-2">{r.requesterName ?? r.requesterId}</td>
                    <td className="p-2">{(r.scopes ?? []).join(", ")}</td>
                    <td className="p-2 capitalize">{r.status}</td>
                    <td className="p-2">
                      {r.status === "approved" && r.expiresAt
                        ? new Date(r.expiresAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
