"use client";

import { useCallback, useEffect, useState } from "react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { Button } from "@/components/ui/button";
import type { ScheduleChangeRequest } from "@/types/db";

type Mitigation = {
  roomId?: string;
  roomCode?: string;
  label?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
};

type Row = ScheduleChangeRequest & {
  instructorName?: string;
  subjectCode?: string;
  sectionName?: string;
  currentDay?: string;
  currentStartTime?: string;
  currentEndTime?: string;
  conflictDetails?: { hits?: unknown[]; suggestedMitigation?: Mitigation } | null;
};

/**
 * College Admin: review instructor schedule change requests, run conflict check, approve/reject, notify faculty.
 */
export function CollegeScheduleChangeRequestsClient() {
  const [requests, setRequests] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<{
    severity?: string;
    summary?: string;
    hits?: unknown[];
    suggestedMitigation?: Mitigation | null;
  } | null>(null);
  const [applySuggestedMitigation, setApplySuggestedMitigation] = useState(false);

  const selected = requests.find((r) => r.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/college/schedule-change-requests", { credentials: "include" });
      const data = (await res.json()) as { requests?: Row[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRequests(data.requests ?? []);
      setSelectedId((cur) => {
        const list = data.requests ?? [];
        if (cur && list.some((x) => x.id === cur)) return cur;
        return list[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setCheckResult(null);
    setAdminNote("");
    setApplySuggestedMitigation(false);
  }, [selectedId]);

  async function runConflictCheck() {
    if (!selected || selected.status !== "pending") return;
    setBusy("check");
    setCheckResult(null);
    try {
      const res = await fetch(`/api/college/schedule-change-requests/${selected.id}/check-conflicts`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        severity?: string;
        summary?: string;
        hits?: unknown[];
        suggestedMitigation?: Mitigation | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Check failed");
      setCheckResult({
        severity: data.severity,
        summary: data.summary,
        hits: data.hits,
        suggestedMitigation: data.suggestedMitigation ?? null,
      });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setBusy(null);
    }
  }

  async function patch(action: "approve" | "reject" | "approve_with_solution") {
    if (!selected || selected.status !== "pending") return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/college/schedule-change-requests/${selected.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminSuggestion: adminNote.trim() || null,
          applySuggestedMitigation: applySuggestedMitigation,
        }),
      });
      const data = (await res.json()) as { error?: string; status?: string; severity?: string; hits?: unknown[] };
      if (res.status === 409) {
        setError(data.error ?? "Conflicts too large — approve blocked.");
        setCheckResult({ severity: data.severity, hits: data.hits });
        return;
      }
      if (!res.ok) throw new Error(data.error || "Update failed");
      setCheckResult(null);
      setAdminNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <ChairmanPageHeader
        title="Schedule change requests"
        subtitle="Review instructor requests, run the conflict checker, then approve or reject. Faculty receive in-app notifications."
      />
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
                        {selected.currentDay} {selected.currentStartTime}–{selected.currentEndTime}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-black/50">Requested</dt>
                      <dd className="font-medium">
                        {selected.requestedDay} {selected.requestedStartTime}–{selected.requestedEndTime}
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
                          <p className="font-semibold text-black/80">Last check</p>
                          <p className="text-black/80">{checkResult.summary}</p>
                          {checkResult.severity ? (
                            <p className="text-xs mt-1 text-black/55">
                              Severity: <strong>{checkResult.severity}</strong>
                            </p>
                          ) : null}
                          {checkResult.suggestedMitigation?.label ? (
                            <div className="mt-2 pt-2 border-t border-black/10">
                              <p className="text-xs font-semibold text-black/60">Suggested mitigation</p>
                              <p className="text-sm text-black/80">{checkResult.suggestedMitigation.label}</p>
                              <label className="mt-2 flex items-start gap-2 text-sm text-black/75 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="mt-1 rounded border-black/20"
                                  checked={applySuggestedMitigation}
                                  onChange={(e) => setApplySuggestedMitigation(e.target.checked)}
                                />
                                <span>
                                  On approval, apply the suggested room change (same day/time as requested).
                                </span>
                              </label>
                            </div>
                          ) : null}
                        </div>
                      ) : selected.conflictSeverity ? (
                        <div className="rounded-lg border border-black/10 bg-[#fafafa] px-3 py-2 text-sm space-y-2">
                          <p className="text-black/70">
                            Stored severity: <strong>{selected.conflictSeverity}</strong> (run check again to refresh)
                          </p>
                          {selected.conflictDetails?.suggestedMitigation?.label ? (
                            <div className="pt-2 border-t border-black/10">
                              <p className="text-xs font-semibold text-black/60">Stored suggested mitigation</p>
                              <p className="text-sm text-black/80">{selected.conflictDetails.suggestedMitigation.label}</p>
                              <label className="mt-2 flex items-start gap-2 text-sm text-black/75 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="mt-1 rounded border-black/20"
                                  checked={applySuggestedMitigation}
                                  onChange={(e) => setApplySuggestedMitigation(e.target.checked)}
                                />
                                <span>Apply suggested room on approval</span>
                              </label>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-black" htmlFor="admin-note">
                          Admin note / suggested mitigation (required for small conflicts or approve with solution)
                        </label>
                        <textarea
                          id="admin-note"
                          className="w-full min-h-[88px] rounded-lg border border-black/15 px-3 py-2 text-sm"
                          placeholder="e.g. move room to Lab 2; or swap with section 2B…"
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          type="button"
                          className="bg-emerald-700 hover:bg-emerald-800 text-white"
                          disabled={busy !== null}
                          onClick={() => void patch("approve")}
                        >
                          {busy === "approve" ? "…" : "Approve"}
                        </Button>
                        <Button
                          type="button"
                          className="bg-[var(--color-opticore-orange)] hover:bg-[#e88909] text-white"
                          disabled={busy !== null}
                          onClick={() => void patch("approve_with_solution")}
                        >
                          {busy === "approve_with_solution" ? "…" : "Approve with solution"}
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
                        Large conflicts block approval (HTTP 409). Small conflicts require a note or &quot;Approve with
                        solution&quot;. Notifications are sent to the instructor after approval or rejection.
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
