"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { useAccessRequests, type AccessRequestWithName } from "@/hooks/use-access-requests";
import {
  ApiClientError,
  accessRequestsApi,
  catalogApi,
} from "@/lib/api/client";
import { GEC_COLLEGE_ACCESS_SCOPES } from "@/lib/access/gec-college-scopes";
import type { AccessRequestRow, AccessScope, College } from "@/types/db";
import { KeyRound } from "lucide-react";

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
    if (r.status !== "approved" || !Array.isArray(r.scopes) || !r.scopes.includes(scope)) {
      return false;
    }
    if (r.expiresAt && new Date(r.expiresAt).getTime() <= now) {
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
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [colleges, setColleges] = useState<Pick<College, "id" | "name" | "code">[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { colleges } = await catalogApi.colleges();
        if (cancelled) return;
        setColleges(colleges as Pick<College, "id" | "name" | "code">[]);
      } catch {
        if (!cancelled) setColleges([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(collegeId: string) {
    setLoadingId(collegeId);
    setMsg(null);
    try {
      await accessRequestsApi.create({
        targetCollegeId: collegeId,
        scopes: [...GEC_COLLEGE_ACCESS_SCOPES],
      });
      setMsg("Request submitted.");
      if (!requestsOverride) await load();
    } catch (e) {
      setMsg(
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed",
      );
    } finally {
      setLoadingId(null);
    }
  }

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
    <DashboardCard title="Request access">
      <p className="text-sm text-black/75 mb-4">
        Choose a college and submit <strong>Request Access</strong>. One request covers plotting access for that college.
      </p>

      {colleges.length === 0 ? (
        <p className="text-sm text-black/55">No colleges available.</p>
      ) : (
        <div className="space-y-3">
          {colleges.map((c) => {
            const state = getGecVacantSlotApprovalUiState(requests, c.id);
            const busy = loadingId === c.id;
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 bg-white px-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-black">{c.name}</p>
                  <p className="text-xs text-black/55">{c.code}</p>
                </div>
                <div className="flex items-center gap-2">
                  {state.status === "approved" ? (
                    <span className={statusBadge("approved")}>Approved</span>
                  ) : state.status === "pending" ? (
                    <span className={statusBadge("pending")}>Pending</span>
                  ) : state.status === "rejected" ? (
                    <span className={statusBadge("rejected")}>Not approved</span>
                  ) : null}
                  {state.status === "approved" || state.status === "pending" ? null : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void submit(c.id)}
                      disabled={busy || Boolean(loadingId)}
                      className="bg-[#780301] hover:bg-[#5a0201]"
                    >
                      <KeyRound className="w-3.5 h-3.5 mr-1" />
                      {busy ? "Submitting…" : state.status === "rejected" ? "Request Access" : "Request Access"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
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
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const college = colleges.find((c) => c.id === r.collegeId);
                  return (
                    <tr key={r.id} className="border-t border-black/10">
                      <td className="p-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="p-2">{college ? `${college.name} (${college.code})` : r.collegeId}</td>
                      <td className="p-2">
                        <span className={statusBadge(r.status)}>{r.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
