"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { useAccessRequests, type AccessRequestWithName } from "@/hooks/use-access-requests";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AccessRequestRow, AccessScope, College } from "@/types/db";
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
  collegeId?: string | null,
): boolean {
  const now = Date.now();
  return requests.some((r) => {
    if (
      r.status !== "approved" ||
      !r.expiresAt ||
      new Date(r.expiresAt).getTime() <= now ||
      !Array.isArray(r.scopes) ||
      !r.scopes.includes(scope)
    ) {
      return false;
    }
    if (collegeId != null && collegeId !== "") {
      return r.collegeId === collegeId;
    }
    return true;
  });
}

/** UI state for GEC vacant-slot editing for one college. */
export type GecVacantSlotApprovalUiState =
  | { status: "approved" }
  | { status: "pending" }
  | { status: "rejected"; reviewedAt: string | null }
  | { status: "idle" };

/**
 * Vacant-slot approval for a specific college (`AccessRequest.collegeId`).
 * Without `collegeId`, returns `idle` (no global grant).
 */
export function getGecVacantSlotApprovalUiState(
  requests: AccessRequestRow[],
  collegeId?: string | null,
): GecVacantSlotApprovalUiState {
  if (!collegeId) return { status: "idle" };
  if (hasActiveScopeGrant(requests, "gec_vacant_slots", collegeId)) {
    return { status: "approved" };
  }
  const scoped = requests.filter((r) => r.collegeId === collegeId);
  const byRecency = [...scoped].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const pending = byRecency.find(
    (r) => r.status === "pending" && Array.isArray(r.scopes) && r.scopes.includes("gec_vacant_slots"),
  );
  if (pending) return { status: "pending" };
  const rejected = byRecency.find(
    (r) => r.status === "rejected" && Array.isArray(r.scopes) && r.scopes.includes("gec_vacant_slots"),
  );
  if (rejected) return { status: "rejected", reviewedAt: rejected.reviewedAt };
  return { status: "idle" };
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
  const [colleges, setColleges] = useState<Pick<College, "id" | "name" | "code">[]>([]);
  const [targetCollegeId, setTargetCollegeId] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    let cancelled = false;
    void supabase
      .from("College")
      .select("id,name,code")
      .order("name")
      .then(({ data }) => {
        if (cancelled) return;
        const list = (data ?? []) as Pick<College, "id" | "name" | "code">[];
        setColleges(list);
        setTargetCollegeId((prev) => prev || list[0]?.id || "");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    setLoading(true);
    setMsg(null);
    try {
      const body: { scopes: AccessScope[]; note?: string; targetCollegeId?: string } = {
        scopes,
        note: note.trim() || undefined,
      };
      if (!targetCollegeId) {
        throw new Error("Choose a college for this request.");
      }
      body.targetCollegeId = targetCollegeId;

      const res = await fetch("/api/access-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setMsg("Request submitted.");
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

  const canSubmit = scopes.length > 0 && !loading && Boolean(targetCollegeId);

  if (variant === "compact") {
    return (
      <DashboardCard title="Request access (GEC)">
        <p className="text-sm text-black/75 mb-3">
          Request College Admin approval <strong>per college</strong> before editing vacant GEC slots in that college.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" asChild className="bg-[#780301] hover:bg-[#5a0201]">
            <Link href="/admin/gec/request-access">
              <KeyRound className="w-4 h-4 mr-2" />
              Open request form
            </Link>
          </Button>
        </div>
        {requests.length > 0 ? (
          <ul className="mt-4 space-y-2 text-xs">
            {requests.slice(0, 5).map((r) => (
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
    <DashboardCard title="Request access (GEC Chairman)">
      <p className="text-sm text-black/75 mb-4">
        Choose the <strong>college</strong> you need (e.g. COTE, then separately CAFE). Approving one college does not
        grant access to others. Optional scopes: Evaluator, INS, vacant GEC slots.
      </p>

      <label className="block text-xs font-medium text-black/60 mb-1">College for this request</label>
      <select
        className="w-full rounded-md border border-black/15 px-3 py-2 text-sm mb-4 bg-white"
        value={targetCollegeId}
        onChange={(e) => setTargetCollegeId(e.target.value)}
      >
        <option value="">Select college…</option>
        {colleges.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.code})
          </option>
        ))}
      </select>

      <div className="space-y-2 mb-4">
        {SCOPE_OPTIONS.map((opt) => (
          <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer">
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
                  <th className="p-2">College</th>
                  <th className="p-2">Scopes</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Expires</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-black/10">
                    <td className="p-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="p-2 font-mono text-[11px]">{r.collegeId}</td>
                    <td className="p-2">{(r.scopes ?? []).join(", ")}</td>
                    <td className="p-2">
                      <span className={statusBadge(r.status)}>{r.status}</span>
                    </td>
                    <td className="p-2">
                      {r.status === "approved" && r.expiresAt ? new Date(r.expiresAt).toLocaleString() : "—"}
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
