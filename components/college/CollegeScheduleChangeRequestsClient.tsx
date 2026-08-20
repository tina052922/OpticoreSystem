"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { Button } from "@/components/ui/button";
import { dispatchInsCatalogReload } from "@/lib/ins/ins-catalog-reload";
import type { ScheduleChangeRequest } from "@/types/db";
import { useOpticoreToast } from "@/components/alerts/OpticoreToastProvider";
import { scheduleChangeApi, ApiClientError } from "@/lib/api/client";
import { formatTimeRange12h } from "@/lib/time/format-12h";

type Mitigation = {
  roomId?: string;
  roomCode?: string;
  label?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
};

type AlternativeSolutionRow = {
  kind?: string;
  label?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  roomCode?: string;
  roomId?: string;
};

type ConflictHitRow = {
  type?: string;
  message?: string;
  detail?: string;
  withEntryId?: string;
};

type Row = ScheduleChangeRequest & {
  instructorName?: string;
  subjectCode?: string;
  sectionName?: string;
  academicPeriodId?: string;
  currentDay?: string;
  currentStartTime?: string;
  currentEndTime?: string;
  conflictDetails?: {
    hits?: ConflictHitRow[];
    suggestedMitigation?: Mitigation;
    alternativeSolutions?: AlternativeSolutionRow[];
    conflictsResolved?: boolean;
  } | null;
};

/**
 * College Admin: review instructor schedule change requests, run conflict check, approve/reject, notify faculty.
 */
export function CollegeScheduleChangeRequestsClient() {
  const toast = useOpticoreToast();
  const [requests, setRequests] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<{
    severity?: string;
    summary?: string;
    hits?: ConflictHitRow[];
    suggestedMitigation?: Mitigation | null;
    alternativeSolutions?: AlternativeSolutionRow[];
  } | null>(null);
  /** Avoid re-running campus check when `requests` refreshes after the same selection. */
  const autoCheckDoneForSelected = useRef<string | null>(null);
  /** Set from API for Supabase Realtime filter (same college as the signed-in admin). */
  const [realtimeCollegeId, setRealtimeCollegeId] = useState<string | null>(null);

  /** Instructor request or index into merged campus-built alternatives list. */
  const [approveSolutionChoice, setApproveSolutionChoice] = useState<"instructor" | number>("instructor");

  const selected = requests.find((r) => r.id === selectedId) ?? null;

  /** Prefer freshest conflict-check response; fallback to persisted `conflictDetails` on the row. */
  const effectiveAlternatives = useMemo((): AlternativeSolutionRow[] => {
    if (checkResult) return checkResult.alternativeSolutions ?? [];
    return selected?.conflictDetails?.alternativeSolutions ?? [];
  }, [checkResult, selected?.conflictDetails?.alternativeSolutions]);

  useEffect(() => {
    setApproveSolutionChoice((c) =>
      typeof c === "number" && (c < 0 || c >= effectiveAlternatives.length) ? "instructor" : c,
    );
  }, [effectiveAlternatives.length, selectedId]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await scheduleChangeApi.list();
      setRequests(data.requests as Row[]);
      if (data.collegeId) setRealtimeCollegeId(data.collegeId);
      setSelectedId((cur) => {
        const list = data.requests ?? [];
        if (cur && list.some((x) => x.id === cur)) return cur;
        return list[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to load");
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Refresh when requests change (polling; Realtime deferred until SSE broker exists). */
  useEffect(() => {
    if (!realtimeCollegeId) return;
    const poll = window.setInterval(() => void load({ silent: true }), 45_000);
    return () => window.clearInterval(poll);
  }, [realtimeCollegeId, load]);

  const runConflictCheck = useCallback(async () => {
    if (!selectedId) return;
    const row = requests.find((r) => r.id === selectedId);
    if (!row || row.status !== "pending") return;
    setBusy("check");
    setCheckResult(null);
    setError(null);
    try {
      const res = await fetch(`/api/college/schedule-change-requests/${row.id}/check-conflicts`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        severity?: string;
        summary?: string;
        hits?: ConflictHitRow[];
        suggestedMitigation?: Mitigation | null;
        alternativeSolutions?: AlternativeSolutionRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Check failed");
      setCheckResult({
        severity: data.severity,
        summary: data.summary,
        hits: data.hits,
        suggestedMitigation: data.suggestedMitigation ?? null,
        alternativeSolutions: data.alternativeSolutions ?? [],
      });
      if ((data.severity ?? "none") === "none") {
        toast.success("No conflicts detected");
      } else {
        toast.info("Conflicts found – see details below", data.summary ?? null);
      }
      void load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Check failed";
      setError(msg);
      toast.error("Failed to run conflict check. Please try again.", msg);
    } finally {
      setBusy(null);
    }
  }, [selectedId, requests, load, toast]);

  useEffect(() => {
    setAdminNote("");
    setCheckResult(null);
    setApproveSolutionChoice("instructor");
    autoCheckDoneForSelected.current = null;
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const row = requests.find((r) => r.id === selectedId);
    if (!row || row.status !== "pending") return;
    if (autoCheckDoneForSelected.current === selectedId) return;
    autoCheckDoneForSelected.current = selectedId;
    void runConflictCheck();
  }, [selectedId, requests, runConflictCheck]);

  async function patch(action: "approve" | "reject") {
    if (!selected || selected.status !== "pending") return;
    if (
      action === "approve" &&
      typeof approveSolutionChoice === "number" &&
      (approveSolutionChoice < 0 || approveSolutionChoice >= effectiveAlternatives.length)
    ) {
      toast.error(
        "Choose a listed alternative",
        "Select an alternative from the list, or choose the instructor’s requested slot.",
      );
      return;
    }

    setBusy(action);
    setError(null);
    try {
      await scheduleChangeApi.review(selected.id, {
        action,
        adminSuggestion: adminNote.trim() || undefined,
      });
      setCheckResult(null);
      setAdminNote("");
      setApproveSolutionChoice("instructor");
      await load();
      const periodId = selected.academicPeriodId;
      dispatchInsCatalogReload(periodId ? { academicPeriodId: periodId } : undefined);
      if (action === "approve") {
        const hadPriorConflict = Boolean(checkResult?.severity && checkResult.severity !== "none");
        toast.success(
          hadPriorConflict ? "Conflicts resolved — request approved." : "Request approved — schedule updated.",
          "INS forms and evaluator refresh for all users.",
        );
      } else {
        toast.success("Request rejected");
      }
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Update failed";
      setError(msg);
      toast.error("Failed to update request. Please try again.", msg);
    } finally {
      setBusy(null);
    }
  }

  const approveDisabled =
    busy !== null ||
    !checkResult?.summary ||
    (approveSolutionChoice === "instructor" &&
      Boolean(checkResult?.severity && checkResult.severity !== "none"));

  const instructorSlotBlockedHint =
    approveSolutionChoice === "instructor" &&
    checkResult?.severity != null &&
    checkResult.severity !== "none";

  return (
    <div>
      <ChairmanPageHeader title="Schedule change requests" />
      <div className="px-4 md:px-8 pb-10 max-w-6xl mx-auto space-y-6">
        {error ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        ) : null}

        {loading ? (
          <p className="text-sm text-black/55">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-black/55 uppercase tracking-wide">Pending &amp; history</label>
              <div className="rounded-xl border border-black/10 bg-white max-h-[480px] overflow-y-auto shadow-sm">
                {requests.length === 0 ? (
                  <p className="p-4 text-sm text-black/50">No schedule change requests yet.</p>
                ) : (
                  <ul className="divide-y divide-black/10">
                    {requests.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(r.id)}
                          className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                            selectedId === r.id ? "bg-[var(--color-opticore-orange)]/12" : "hover:bg-black/[0.03]"
                          }`}
                        >
                          <div className="font-medium text-black truncate">{r.subjectCode ?? "—"} · {r.sectionName ?? "—"}</div>
                          <div className="text-xs text-black/50">{r.instructorName}</div>
                          <div className="text-xs mt-0.5">
                            <span
                              className={
                                r.status === "pending"
                                  ? "text-amber-800 font-semibold"
                                  : r.status === "approved" || r.status === "approved_with_solution"
                                    ? "text-emerald-800 font-semibold"
                                    : "text-red-800 font-semibold"
                              }
                            >
                              {r.status}
                            </span>
                            {r.conflictSeverity ? ` · conflicts: ${r.conflictSeverity}` : ""}
                            {(r.status === "approved" || r.status === "approved_with_solution") &&
                            r.conflictDetails?.conflictsResolved ? (
                              <span className="ml-1 inline-flex rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900">
                                Conflicts resolved
                              </span>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 rounded-xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
              {!selected ? (
                <p className="text-sm text-black/50">Select a request.</p>
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-black">Request detail</h2>
                    <p className="text-xs text-black/50 mt-1">Request id: {selected.id}</p>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-black/50">Instructor</dt>
                      <dd className="font-medium">{selected.instructorName}</dd>
                    </div>
                    <div>
                      <dt className="text-black/50">Status</dt>
                      <dd className="font-medium">{selected.status}</dd>
                    </div>
                    <div>
                      <dt className="text-black/50">Subject / section</dt>
                      <dd className="font-medium">
                        {[selected.subjectCode, selected.sectionName].filter(Boolean).length > 0
                          ? `${selected.subjectCode ?? "—"} · ${selected.sectionName ?? "—"}`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-black/50">Current</dt>
                      <dd className="font-medium">
                        {selected.currentDay}{" "}
                        {selected.currentStartTime && selected.currentEndTime
                          ? formatTimeRange12h(selected.currentStartTime, selected.currentEndTime)
                          : "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-black/50">Requested</dt>
                      <dd className="font-medium">
                        {selected.requestedDay}{" "}
                        {formatTimeRange12h(selected.requestedStartTime, selected.requestedEndTime)}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-black/50">Reason</dt>
                      <dd className="text-black/85 whitespace-pre-wrap">{selected.reason}</dd>
                    </div>
                  </dl>

                  {selected.status === "pending" ? (
                    <>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          type="button"
                          className="bg-[var(--color-opticore-orange)] hover:bg-[#e88909] text-white"
                          disabled={busy !== null}
                          onClick={() => void runConflictCheck()}
                        >
                          {busy === "check" ? "Checking…" : "Run conflict checker"}
                        </Button>
                      </div>

                      {checkResult?.summary ? (
                        <div
                          className={`rounded-lg border px-3 py-2 text-sm ${
                            checkResult.severity === "none"
                              ? "border-emerald-200 bg-emerald-50/90"
                              : "border-black/10 bg-[#fafafa]"
                          }`}
                        >
                          <p className="font-semibold text-black/80">Last check (campus-wide)</p>
                          <p className="text-black/80">{checkResult.summary}</p>
                          {checkResult.severity ? (
                            <p className="text-xs mt-1 text-black/55">
                              Severity: <strong>{checkResult.severity}</strong>
                            </p>
                          ) : null}
                          {checkResult.hits && checkResult.hits.length > 0 ? (
                            <ul className="mt-3 space-y-2 border-t border-black/10 pt-3">
                              {checkResult.hits.map((hit, idx) => (
                                <li
                                  key={`${hit.withEntryId ?? idx}-${idx}`}
                                  className="rounded-md border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-xs text-amber-950"
                                >
                                  <span className="font-bold uppercase tracking-wide text-amber-900/90">
                                    {hit.type ?? "conflict"}
                                  </span>
                                  : {hit.message ?? "—"}
                                  {hit.detail ? (
                                    <p className="mt-1 text-[11px] leading-snug text-amber-950/95">{hit.detail}</p>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {checkResult.suggestedMitigation?.label ? (
                            <p className="mt-2 text-[12px] text-black/75">
                              <span className="font-semibold text-black/60">Suggested room (same list as alternatives):</span>{" "}
                              {checkResult.suggestedMitigation.label}
                            </p>
                          ) : null}
                        </div>
                      ) : selected.conflictSeverity ? (
                        <div className="rounded-lg border border-black/10 bg-[#fafafa] px-3 py-2 text-sm space-y-2">
                          <p className="text-black/70">
                            Stored severity: <strong>{selected.conflictSeverity}</strong> (run check again to refresh)
                          </p>
                        </div>
                      ) : null}

                      <fieldset className="rounded-lg border border-black/15 bg-white px-3 py-3 space-y-2.5">
                        <legend className="text-sm font-semibold text-black px-1">Apply on approve</legend>
                        <p className="text-xs text-black/55 pb-1 leading-relaxed">
                          One choice per approve. Allowed only when the selected slot has <strong>zero</strong> clashes
                          after campus-wide check.
                          {!checkResult?.summary ? " Run the conflict checker." : null}
                        </p>
                        {checkResult?.severity === "none" ? (
                          <p className="text-xs font-medium text-emerald-800 bg-emerald-50/80 border border-emerald-200/80 rounded-md px-2 py-1.5">
                            Ready to approve — no conflicts on last check for the instructor&apos;s proposed slot.
                          </p>
                        ) : null}
                        {instructorSlotBlockedHint ? (
                          <p className="text-xs font-medium text-amber-900 bg-amber-50/90 border border-amber-200/80 rounded-md px-2 py-1.5">
                            Instructor proposed slot conflicts — choose a clash-free alternative or reject.
                          </p>
                        ) : null}
                        <label className="flex gap-2.5 items-start cursor-pointer text-sm">
                          <input
                            type="radio"
                            name={`scr-sol-${selected.id}`}
                            className="mt-1 shrink-0"
                            checked={approveSolutionChoice === "instructor"}
                            onChange={() => setApproveSolutionChoice("instructor")}
                          />
                          <span>
                            <span className="font-semibold text-black">Instructor’s requested slot</span>
                            <span className="text-black/70 block text-xs tabular-nums">
                              {selected.requestedDay}{" "}
                              {formatTimeRange12h(selected.requestedStartTime, selected.requestedEndTime)}
                            </span>
                          </span>
                        </label>
                        {effectiveAlternatives.map((alt, idx) => (
                          <label
                            key={`${alt.kind ?? "alt"}-${idx}-${alt.day ?? ""}-${alt.startTime ?? ""}`}
                            className="flex gap-2.5 items-start cursor-pointer text-sm"
                          >
                            <input
                              type="radio"
                              name={`scr-sol-${selected.id}`}
                              className="mt-1 shrink-0"
                              checked={approveSolutionChoice === idx}
                              onChange={() => setApproveSolutionChoice(idx)}
                            />
                            <span>
                              <span className="font-semibold capitalize text-black">{alt.kind ?? "Alternative"}</span>
                              <span className="text-black/80 block text-xs leading-snug">{alt.label}</span>
                            </span>
                          </label>
                        ))}
                      </fieldset>

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-black" htmlFor="admin-note">
                          Admin note (optional)
                        </label>
                        <textarea
                          id="admin-note"
                          className="w-full min-h-[88px] rounded-lg border border-black/15 px-3 py-2 text-sm"
                          placeholder="e.g. approve: use Lab 2; reject: schedule is locked until VPAA publishes…"
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          type="button"
                          className="bg-emerald-700 hover:bg-emerald-800 text-white"
                          disabled={approveDisabled}
                          onClick={() => void patch("approve")}
                        >
                          {busy === "approve" ? "…" : "Approve with selected solution"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-red-300 text-red-800"
                          disabled={busy !== null}
                          onClick={() => void patch("reject")}
                        >
                          {busy === "reject" ? "…" : "Reject"}
                        </Button>
                      </div>
                      <p className="text-xs text-black/45 leading-relaxed">
                        Notifications cover instructor and related users where configured.
                      </p>
                    </>
                  ) : (
                    <div className="text-sm text-black/75">
                      {selected.adminSuggestion ? (
                        <p>
                          <span className="text-black/50">Admin note: </span>
                          {selected.adminSuggestion}
                        </p>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
