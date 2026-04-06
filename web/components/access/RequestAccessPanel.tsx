"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { useAccessRequests, type AccessRequestWithName } from "@/hooks/use-access-requests";
import type { AccessRequestRow, AccessScope } from "@/types/db";
import { KeyRound, Lock } from "lucide-react";

const SCOPE_OPTIONS: { id: AccessScope; label: string }[] = [
  { id: "evaluator", label: "Central Hub Evaluator" },
  { id: "ins_forms", label: "INS Forms (schedule views)" },
  { id: "gec_vacant_slots", label: "Vacant GEC slots (edit only)" },
];

function statusBadge(status: string) {
  const base = "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold";
  if (status === "approved") return `${base} bg-emerald-100 text-emerald-900`;
  if (status === "rejected") return `${base} bg-red-100 text-red-900`;
  return `${base} bg-amber-100 text-amber-900`;
}

export function hasActiveScopeGrant(
  requests: AccessRequestRow[],
  scope: AccessScope,
): boolean {
  const now = Date.now();
  return requests.some(
    (r) =>
      r.status === "approved" &&
      r.expiresAt &&
      new Date(r.expiresAt).getTime() > now &&
      Array.isArray(r.scopes) &&
      r.scopes.includes(scope),
  );
}

type Props = {
  variant?: "full" | "compact";
  /** Pass from parent to avoid duplicate fetches (e.g. vacant-slots + compact card). */
  requestsOverride?: AccessRequestWithName[];
};

export function RequestAccessPanel({ variant = "full", requestsOverride }: Props) {
  const { requests: fetched, reload: load } = useAccessRequests(requestsOverride === undefined);
  const requests = requestsOverride ?? fetched;
  const [scopes, setScopes] = useState<AccessScope[]>(["gec_vacant_slots"]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/access-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopes, note: note.trim() || undefined }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setMsg("Request submitted. College Admin will review. Check status below and Inbox → Sent.");
      setNote("");
      if (!requestsOverride) await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function toggleScope(id: AccessScope) {
    setScopes((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  const canSubmit = scopes.length > 0 && !loading;

  if (variant === "compact") {
    return (
      <DashboardCard title="Request access">
        <p className="text-sm text-black/75 mb-3">
          Need Evaluator, INS, or vacant GEC slot editing? Submit a scoped request for College Admin approval.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            asChild
            className="bg-[#780301] hover:bg-[#5a0201]"
          >
            <Link href="/admin/gec/request-access">
              <KeyRound className="w-4 h-4 mr-2" />
              Open Request Access
            </Link>
          </Button>
        </div>
        {requests.length > 0 ? (
          <ul className="mt-4 space-y-2 text-xs">
            {requests.slice(0, 3).map((r) => (
              <li key={r.id} className="flex justify-between gap-2">
                <span className="text-black/70">{new Date(r.createdAt).toLocaleString()}</span>
                <span className={statusBadge(r.status)}>{r.status}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title="Request access">
      <p className="text-sm text-black/75 mb-4">
        Choose what you need. For <strong>GEC Chairman</strong>, requests are routed to <strong>College Admin (COTE)</strong>{" "}
        for vacant GEC slot editing. <strong>College Admin</strong> approves temporary access (default{" "}
        <strong>14 days</strong>). Status: <strong>Pending</strong> / <strong>Approved</strong> / <strong>Rejected</strong>.
      </p>

      <div className="space-y-2 mb-4">
        {SCOPE_OPTIONS.map((opt) => (
          <label
            key={opt.id}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
              checked={scopes.includes(opt.id)}
              onChange={() => toggleScope(opt.id)}
              className="rounded border-black/20"
            />
            {opt.label}
          </label>
        ))}
      </div>

      <label className="block text-xs font-medium text-black/60 mb-1">Note (optional)</label>
      <textarea
        className="w-full rounded-md border border-black/15 px-3 py-2 text-sm min-h-[80px] mb-4"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Context for the approver…"
      />

      <Button
        type="button"
        onClick={() => void submit()}
        disabled={!canSubmit}
        className="bg-[#780301] hover:bg-[#5a0201]"
      >
        <Lock className="w-4 h-4 mr-2" />
        {loading ? "Submitting…" : "Submit request"}
      </Button>
      {msg ? <p className="text-sm text-black/70 mt-3">{msg}</p> : null}

      <div className="mt-8 border-t border-black/10 pt-6">
        <h3 className="text-sm font-semibold mb-3">Your requests</h3>
        {requests.length === 0 ? (
          <p className="text-sm text-black/50">No requests yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/10">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="bg-black/[0.04]">
                  <th className="p-2">When</th>
                  <th className="p-2">Scopes</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Expires</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-black/10">
                    <td className="p-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="p-2">{(r.scopes ?? []).join(", ")}</td>
                    <td className="p-2">
                      <span className={statusBadge(r.status)}>{r.status}</span>
                    </td>
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
      </div>
    </DashboardCard>
  );
}
