"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ApiClientError,
  instructorRequestsApi,
  type InstructorRequest,
  type LinkableFaculty,
} from "@/lib/api/client";

/**
 * Chairman queue for instructor self-registrations.
 *
 * Each row has already proven control of a `@ctu.edu.ph` mailbox. What the
 * chairman decides here is *who the person is* — specifically, which Employee
 * ID they get, which is what binds them to any schedule already plotted.
 *
 * 🔒 No account exists until Approve succeeds. Rejecting leaves the applicant
 * unable to sign in, which is the safe default.
 */

type Decision = { id: string; kind: "approve" | "reject" } | null;

const fieldClass =
  "h-10 rounded-lg border border-black/25 bg-white px-3 text-sm shadow-sm w-full";

const profileEntries = (profile: InstructorRequest["profile"]) =>
  Object.entries(profile ?? {}).filter(([, v]) => v != null && v !== "");

export function PendingInstructorsReview() {
  const [requests, setRequests] = useState<InstructorRequest[]>([]);
  const [candidates, setCandidates] = useState<LinkableFaculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  /** Per-row draft: chosen Employee ID and optional placeholder to adopt. */
  const [draft, setDraft] = useState<
    Record<string, { employeeId: string; linkUserId: string; notes: string }>
  >({});
  const [confirming, setConfirming] = useState<Decision>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [queue, linkable] = await Promise.all([
        instructorRequestsApi.list("all"),
        // Non-fatal: without candidates the chairman can still type an ID.
        instructorRequestsApi.linkableFaculty().catch(() => ({ candidates: [] })),
      ]);
      setRequests(queue.requests);
      setCandidates(linkable.candidates);

      setDraft((prev) => {
        const next = { ...prev };
        for (const r of queue.requests) {
          // Seed with what the applicant claimed, so the common case is one
          // click — but it stays editable, because it is only a claim.
          next[r.id] ??= {
            employeeId: r.claimedEmployeeId ?? "",
            linkUserId: "",
            notes: "",
          };
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests],
  );
  const history = useMemo(
    () => requests.filter((r) => r.status !== "pending"),
    [requests],
  );

  async function approve(row: InstructorRequest) {
    const d = draft[row.id];
    const linkUserId = d?.linkUserId?.trim() || undefined;
    const employeeId = d?.employeeId?.trim() || undefined;

    if (!linkUserId && !employeeId) {
      setError("Enter an Employee ID, or link an existing faculty record.");
      return;
    }

    setBusyId(row.id);
    setError(null);
    setNotice(null);
    try {
      const res = await instructorRequestsApi.approve(row.id, {
        employeeId,
        linkUserId,
      });
      setNotice(res.message);
      setConfirming(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not approve.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(row: InstructorRequest) {
    setBusyId(row.id);
    setError(null);
    setNotice(null);
    try {
      await instructorRequestsApi.reject(row.id, {
        reviewerNotes: draft[row.id]?.notes?.trim() || undefined,
      });
      setNotice(`Rejected ${row.fullName}.`);
      setConfirming(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not reject.");
    } finally {
      setBusyId(null);
    }
  }

  function patch(id: string, next: Partial<(typeof draft)[string]>) {
    setDraft((prev) => ({
      ...prev,
      // The `?? {...}` fallback matters: a row can be edited before `load`
      // seeds its draft (fast typing on a slow first paint).
      [id]: { ...(prev[id] ?? { employeeId: "", linkUserId: "", notes: "" }), ...next },
    }));
  }

  if (loading) {
    return <p className="px-4 py-6 text-sm text-black/55">Loading requests…</p>;
  }

  return (
    <div className="space-y-8 px-4 pb-10 sm:px-6 lg:px-8">
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}

      <section>
        <h2 className="mb-1 text-lg font-semibold">
          Pending approval{pending.length > 0 ? ` (${pending.length})` : ""}
        </h2>
        <p className="mb-4 text-sm text-black/55">
          These instructors verified their CTU email. They cannot sign in until you
          approve them and confirm an Employee ID.
        </p>

        {pending.length === 0 ? (
          <p className="text-sm text-black/55">No instructors are waiting for approval.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((r) => {
              const d = draft[r.id] ?? { employeeId: "", linkUserId: "", notes: "" };
              const details = profileEntries(r.profile);
              const isOpen = expanded === r.id;
              const busy = busyId === r.id;

              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-black/10 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#181818]">{r.fullName}</p>
                      <p className="text-sm text-black/70">{r.deliveryEmail}</p>
                      <p className="mt-1 text-xs text-black/45">
                        Verified {new Date(r.verifiedAt).toLocaleString()}
                        {r.claimedEmployeeId
                          ? ` · claims ID ${r.claimedEmployeeId}`
                          : " · no ID provided"}
                      </p>
                    </div>
                    {details.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                        className="text-sm font-medium text-[#5483b3] hover:underline"
                      >
                        {isOpen ? "Hide details" : "View details"}
                      </button>
                    ) : null}
                  </div>

                  {isOpen && details.length > 0 ? (
                    <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 rounded-lg bg-black/[0.03] p-3 text-sm sm:grid-cols-2">
                      {details.map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <dt className="shrink-0 font-medium capitalize text-black/60">
                            {key.replace(/([A-Z])/g, " $1").toLowerCase()}:
                          </dt>
                          <dd className="min-w-0 break-words">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`link-${r.id}`}
                        className="mb-1 block text-sm font-medium text-[#181818]"
                      >
                        Link to existing faculty record
                      </label>
                      <select
                        id={`link-${r.id}`}
                        value={d.linkUserId}
                        onChange={(e) => {
                          const picked = candidates.find((c) => c.id === e.target.value);
                          patch(r.id, {
                            linkUserId: e.target.value,
                            // Adopting a placeholder means adopting its ID.
                            employeeId: picked?.employeeId ?? d.employeeId,
                          });
                        }}
                        className={fieldClass}
                      >
                        <option value="">Create a new record</option>
                        {candidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name ?? "(unnamed)"}
                            {c.employeeId ? ` — ${c.employeeId}` : ""}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-black/55">
                        Pick the placeholder you created in Faculty Profile so any
                        schedule already plotted for them carries over.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor={`empid-${r.id}`}
                        className="mb-1 block text-sm font-medium text-[#181818]"
                      >
                        Employee ID
                      </label>
                      <Input
                        id={`empid-${r.id}`}
                        value={d.employeeId}
                        onChange={(e) => patch(r.id, { employeeId: e.target.value })}
                        placeholder="CTU employee / staff ID"
                        className={fieldClass}
                      />
                      <p className="mt-1 text-xs text-black/55">
                        Must be unique. This is what links them to their schedule.
                      </p>
                    </div>
                  </div>

                  {confirming?.id === r.id ? (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      {confirming.kind === "approve" ? (
                        <p className="text-sm text-amber-950">
                          Create an account for <strong>{r.fullName}</strong>
                          {d.linkUserId ? " linked to the selected faculty record" : ""} with
                          Employee ID <strong>{d.employeeId || "—"}</strong>? They will be
                          able to sign in immediately.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-amber-950">
                            Reject <strong>{r.fullName}</strong>? No account is created and
                            they&apos;ll be emailed this reason.
                          </p>
                          <Input
                            value={d.notes}
                            onChange={(e) => patch(r.id, { notes: e.target.value })}
                            placeholder="Reason (optional, shown to the applicant)"
                            className={fieldClass}
                          />
                        </div>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          type="button"
                          disabled={busy}
                          className={
                            confirming.kind === "approve"
                              ? "bg-emerald-700 hover:bg-emerald-800"
                              : "bg-red-700 hover:bg-red-800"
                          }
                          onClick={() =>
                            void (confirming.kind === "approve" ? approve(r) : reject(r))
                          }
                        >
                          {busy
                            ? "Working…"
                            : confirming.kind === "approve"
                              ? "Yes, approve"
                              : "Yes, reject"}
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setConfirming(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        type="button"
                        className="bg-emerald-700 hover:bg-emerald-800"
                        disabled={busy}
                        onClick={() => setConfirming({ id: r.id, kind: "approve" })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setConfirming({ id: r.id, kind: "reject" })}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-black/55">No reviewed registrations yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/10">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="bg-black/[0.06]">
                  <th className="p-2">Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Reviewed</th>
                  <th className="p-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} className="border-t border-black/10 bg-white">
                    <td className="p-2 font-medium">{r.fullName}</td>
                    <td className="p-2">{r.deliveryEmail}</td>
                    <td className="p-2">
                      <span
                        className={
                          r.status === "approved"
                            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800"
                            : "rounded-full bg-red-100 px-2 py-0.5 text-red-800"
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : "—"}
                    </td>
                    <td className="p-2 max-w-xs truncate" title={r.reviewerNotes ?? ""}>
                      {r.reviewerNotes || "—"}
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
