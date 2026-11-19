"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  instructorRequestsApi,
  type InstructorRequest,
  type LinkableFaculty,
} from "@/lib/api/client";
import { facultyCategoryBadge, isGecFacultyCategory } from "@/lib/faculty/faculty-category";
import { useActionToast } from "@/components/alerts/useActionToast";

/**
 * Chairperson queue for instructor self-registrations.
 *
 * Each row has already proven control of a `@ctu.edu.ph` mailbox. What the
 * chairperson decides here is *who the person is* — specifically, which Employee
 * ID they get, which is what binds them to any schedule already plotted.
 *
 * 🔒 No account exists until Approve succeeds. Rejecting leaves the applicant
 * unable to sign in, which is the safe default.
 */

type Decision = { id: string; kind: "approve" | "reject" } | null;

const fieldClass =
  "h-10 rounded-lg border border-black/25 bg-white px-3 text-sm shadow-sm w-full";

const profileEntries = (profile: InstructorRequest["profile"]) =>
  Object.entries(profile ?? {}).filter(
    ([k, v]) =>
      v != null &&
      v !== "" &&
      k !== "facultyCategory" &&
      k !== "homeProgramId",
  );

export function PendingInstructorsReview() {
  const [requests, setRequests] = useState<InstructorRequest[]>([]);
  const [candidates, setCandidates] = useState<LinkableFaculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useActionToast();
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  /** Per-row draft: chosen Employee ID and optional placeholder to adopt. */
  const [draft, setDraft] = useState<
    Record<string, { employeeId: string; linkUserId: string; notes: string }>
  >({});
  const [confirming, setConfirming] = useState<Decision>(null);
  /** History row whose email is being edited, and the typed value. */
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  /** History row waiting for "Yes, delete". */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [queue, linkable] = await Promise.all([
        instructorRequestsApi.list("all"),
        // Non-fatal: without candidates the chairperson can still type an ID.
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
      toast.fail(e, "Could not load the registrations", "pending instructors");
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
      toast.refuse(
        "An Employee ID is needed",
        "Enter one, or link this person to an existing faculty record.",
      );
      return;
    }

    setBusyId(row.id);
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
      toast.fail(e, "Could not approve the registration", "pending instructors: approve");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(row: InstructorRequest) {
    setBusyId(row.id);
    setNotice(null);
    try {
      await instructorRequestsApi.reject(row.id, {
        reviewerNotes: draft[row.id]?.notes?.trim() || undefined,
      });
      setNotice(`Rejected ${row.fullName}.`);
      setConfirming(null);
      await load();
    } catch (e) {
      toast.fail(e, "Could not reject the registration", "pending instructors: reject");
    } finally {
      setBusyId(null);
    }
  }

  async function saveEmail(row: InstructorRequest) {
    const next = emailDraft.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      toast.refuse("Enter a valid email address");
      return;
    }
    setBusyId(row.id);
    try {
      const res = await instructorRequestsApi.updateEmail(row.id, next);
      toast.ok(
        "Email updated successfully",
        res.accountUpdated ? `${row.fullName} now signs in with ${res.email}.` : `Saved as ${res.email}.`,
      );
      setEditingEmailId(null);
      await load();
    } catch (e) {
      toast.fail(e, "Could not update the email", "instructor management: email");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteEntry(row: InstructorRequest) {
    setBusyId(row.id);
    try {
      await instructorRequestsApi.remove(row.id);
      toast.ok("Entry deleted successfully", `${row.fullName} was removed from the history.`);
      setConfirmDeleteId(null);
      await load();
    } catch (e) {
      toast.fail(e, "Could not delete the entry", "instructor management: delete");
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
                      <p className="font-semibold text-[#181818]">
                        {r.fullName}
                        {isGecFacultyCategory(r.facultyCategory) ? (
                          <span className="ml-2 inline-block rounded-md bg-[#780301]/10 px-1.5 py-0.5 text-xs font-semibold text-[#780301]">
                            {facultyCategoryBadge(r.facultyCategory)}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm text-black/70">{r.deliveryEmail}</p>
                      <p className="mt-1 text-xs text-black/45">
                        Verified {new Date(r.verifiedAt).toLocaleString()}
                        {r.claimedEmployeeId
                          ? ` · claims ID ${r.claimedEmployeeId}`
                          : " · no ID provided"}
                        {isGecFacultyCategory(r.facultyCategory) ? " · also teaches GEC" : ""}
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
        <h2 className="mb-1 text-lg font-semibold">
          History{history.length > 0 ? ` (${history.length})` : ""}
        </h2>
        <p className="mb-3 text-sm text-black/55">
          Category and email show the instructor as they are now. Changing the email of an approved instructor
          changes their sign-in address. Deleting removes the entry only — not the account.
        </p>
        {history.length === 0 ? (
          <p className="text-sm text-black/55">No reviewed registrations yet.</p>
        ) : (
          // Its own scroll, so a long history does not stretch the page.
          <div className="max-h-[360px] overflow-auto overscroll-contain rounded-lg border border-black/10">
            <table className="w-full text-left text-[12.5px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#f1eeee]">
                  <th className="px-2 py-1.5">Name</th>
                  <th className="px-2 py-1.5">Category</th>
                  <th className="px-2 py-1.5">Email</th>
                  <th className="px-2 py-1.5">Status</th>
                  <th className="px-2 py-1.5">Reviewed</th>
                  <th className="px-2 py-1.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => {
                  const live = r.account?.exists ? r.account : null;
                  const category = live?.facultyCategory ?? r.facultyCategory;
                  const email = live?.email ?? r.deliveryEmail;
                  const editing = editingEmailId === r.id;
                  const rowBusy = busyId === r.id;
                  return (
                    <tr key={r.id} className="border-t border-black/10 bg-white align-middle">
                      <td className="px-2 py-1.5 font-medium">{r.fullName}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {facultyCategoryBadge(category) || "Program"}
                      </td>
                      <td className="px-2 py-1.5">
                        {editing ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Input
                              type="email"
                              value={emailDraft}
                              onChange={(e) => setEmailDraft(e.target.value)}
                              className="h-8 min-w-[220px] text-[12.5px]"
                              autoFocus
                              disabled={rowBusy}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void saveEmail(r);
                                if (e.key === "Escape") setEditingEmailId(null);
                              }}
                            />
                            <Button size="sm" type="button" className="h-8 bg-[#780301] text-white hover:bg-[#5a0201]" disabled={rowBusy} onClick={() => void saveEmail(r)}>
                              {rowBusy ? "Saving…" : "Save"}
                            </Button>
                            <Button size="sm" type="button" variant="outline" className="h-8" disabled={rowBusy} onClick={() => setEditingEmailId(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <span className="break-all">{email}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
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
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        {confirmDeleteId === r.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-[12px] text-black/65">Delete entry?</span>
                            <Button size="sm" type="button" className="h-7 bg-red-700 px-2 text-[12px] hover:bg-red-800" disabled={rowBusy} onClick={() => void deleteEntry(r)}>
                              {rowBusy ? "Deleting…" : "Yes, delete"}
                            </Button>
                            <Button size="sm" type="button" variant="outline" className="h-7 px-2 text-[12px]" disabled={rowBusy} onClick={() => setConfirmDeleteId(null)}>
                              No
                            </Button>
                          </span>
                        ) : (
                          <span className="inline-flex gap-1.5">
                            <Button
                              size="sm"
                              type="button"
                              variant="outline"
                              className="h-7 px-2 text-[12px]"
                              disabled={rowBusy || editing}
                              onClick={() => {
                                setConfirmDeleteId(null);
                                setEditingEmailId(r.id);
                                setEmailDraft(email);
                              }}
                            >
                              Edit email
                            </Button>
                            <Button
                              size="sm"
                              type="button"
                              variant="outline"
                              className="h-7 px-2 text-[12px] text-red-800"
                              disabled={rowBusy}
                              onClick={() => {
                                setEditingEmailId(null);
                                setConfirmDeleteId(r.id);
                              }}
                            >
                              Delete
                            </Button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
