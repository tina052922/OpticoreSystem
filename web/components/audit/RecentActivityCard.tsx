"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { formatAuditActionEnglish } from "@/lib/audit/format-audit-entry";
import type { AuditEntry } from "./AuditLogViewer";

type Props = {
  /** Full audit log route for this portal. Omit for default college log; pass `null` to hide the footer link. */
  auditHref?: string | null;
};

export function RecentActivityCard({ auditHref = "/admin/college/audit-log" }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/audit-log?limit=6", { credentials: "include" });
    const data = (await res.json().catch(() => null)) as { entries?: AuditEntry[] } | null;
    if (res.ok && data?.entries) setEntries(data.entries);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardCard title="Recent activity">
      {entries.length === 0 ? (
        <p className="text-sm text-black/55">No activity recorded yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {entries.map((e) => (
            <li key={e.id} className="flex flex-col gap-0.5 border-b border-black/5 pb-2 last:border-0">
              <span className="text-[11px] text-black/45">{new Date(e.createdAt).toLocaleString()}</span>
              <span className="font-medium text-black/85 leading-snug">{formatAuditActionEnglish(e.action)}</span>
              <span className="text-xs text-black/55">
                {e.actorName ?? e.actorId} · {e.entityType}
              </span>
            </li>
          ))}
        </ul>
      )}
      {auditHref ? (
        <Link href={auditHref} className="inline-block mt-4 text-sm font-medium text-[#780301] hover:underline">
          Open full audit log →
        </Link>
      ) : null}
    </DashboardCard>
  );
}
