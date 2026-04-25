"use client";

import { useCallback, useEffect, useState } from "react";
import { formatAuditActionEnglish, formatAuditDetailsEnglish } from "@/lib/audit/format-audit-entry";

export type AuditEntry = {
  id: string;
  actorId: string;
  actorName?: string;
  collegeId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export function AuditLogViewer() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/audit-log?limit=100", { credentials: "include" });
    const data = (await res.json().catch(() => null)) as { entries?: AuditEntry[]; error?: string } | null;
    if (!res.ok) {
      setError(data?.error || "Failed to load audit log");
      return;
    }
    setEntries(data?.entries ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-black/10">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="bg-[#780301] text-white">
              <th className="p-2">Time</th>
              <th className="p-2">User</th>
              <th className="p-2">Action</th>
              <th className="p-2">Entity</th>
              <th className="p-2">Message</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-black/50">
                  No audit entries yet. Access requests, Chairman/GEC schedule writes, and CAS/DOI workflow events appear
                  here.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-t border-black/10">
                  <td className="p-2 whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="p-2">{e.actorName ?? e.actorId}</td>
                  <td className="p-2 text-[12px] text-black/90 leading-snug">{formatAuditActionEnglish(e.action)}</td>
                  <td className="p-2">
                    {e.entityType}
                    {e.entityId ? <span className="text-black/45"> · {e.entityId.slice(0, 8)}…</span> : null}
                  </td>
                  <td className="p-2 max-w-xl text-[12px] text-black/85 leading-snug">
                    {formatAuditDetailsEnglish(e)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
